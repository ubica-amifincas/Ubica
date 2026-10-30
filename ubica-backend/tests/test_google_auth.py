"""Inicio de sesión con Google: alta, vinculación con cuentas existentes y casos de error.
La firma del token la comprueba google-auth; aquí se sustituye la verificación por datos fijos."""
import bcrypt
import pytest
from sqlmodel import select
from google.auth.exceptions import TransportError

import models
import routers.auth as auth_router
import services.google_auth as google_auth
from conftest import auth
from security import create_access_token

PASSWORD = "secret123"
_FAST_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(4)).decode()
CLIENT_ID = "test-client.apps.googleusercontent.com"
CREDENTIAL = "x" * 40


def google_info(email="ana@gmail.com", name="Ana Pérez"):
    return {"email": email, "email_verified": True, "name": name, "sub": "1234567890"}


@pytest.fixture
def google(monkeypatch):
    """Activa Google con un Client ID de prueba; devuelve un setter para lo que 'verifica' Google."""
    monkeypatch.setattr(auth_router, "GOOGLE_CLIENT_ID", CLIENT_ID)
    state = {"result": google_info()}

    def fake_verify(credential):
        if isinstance(state["result"], Exception):
            raise state["result"]
        return state["result"]

    monkeypatch.setattr(auth_router, "verify_google_credential", fake_verify)
    return lambda result: state.update(result=result)


def make_user(db, email="ana@gmail.com", **kw):
    user = models.User(email=email, role=kw.pop("role", "user"), hashed_password=_FAST_HASH, **kw)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def google_login(client, **body):
    return client.post("/api/auth/google", json={"credential": CREDENTIAL, **body})


def login(client, email, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_config_without_client_id_hides_google(client, monkeypatch):
    monkeypatch.setattr(auth_router, "GOOGLE_CLIENT_ID", "")
    assert client.get("/api/auth/google/config").json() == {"client_id": None}
    assert google_login(client).status_code == 404


def test_config_exposes_client_id(client, google):
    assert client.get("/api/auth/google/config").json() == {"client_id": CLIENT_ID}


def test_new_google_user_must_choose_role_and_accept_terms(client, db, google):
    # Sin tipo de cuenta ni condiciones aceptadas no se crea nada: la web pide completar el registro
    for body in ({}, {"role": "user"}, {"accept_terms": True}):
        res = google_login(client, **body)
        assert res.status_code == 200
        assert res.json() == {"needs_signup": True, "email": "ana@gmail.com", "full_name": "Ana Pérez"}
    assert db.exec(select(models.User)).all() == []


def test_new_google_user_is_created_verified(client, db, google):
    res = google_login(client, role="user", accept_terms=True)
    assert res.status_code == 200
    body = res.json()
    assert body["user"]["email"] == "ana@gmail.com"
    assert body["user"]["full_name"] == "Ana Pérez"
    assert body["user"]["role"] == "user"
    assert body["user"]["is_verified"] is True
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == "ana@gmail.com"
    # Una sola cuenta aunque entre dos veces
    assert google_login(client).json()["user"]["id"] == body["user"]["id"]
    assert db.get(models.User, body["user"]["id"]).terms_accepted_at is not None


def test_signup_role_is_used_only_for_new_accounts(client, db, google):
    assert google_login(client, role="investor", accept_terms=True).json()["user"]["role"] == "investor"
    make_user(db, email="otro@gmail.com", role="user", is_verified=True)
    google(google_info(email="otro@gmail.com"))
    assert google_login(client, role="realtor", accept_terms=True).json()["user"]["role"] == "user"


def test_google_realtor_signup_waits_for_approval(client, db, google):
    user = google_login(client, role="realtor", accept_terms=True).json()["user"]
    assert user["role"] == "realtor" and user["is_approved"] is False


def test_admin_role_cannot_be_requested(client, google):
    assert google_login(client, role="admin").status_code == 422


def test_existing_verified_account_is_linked_and_keeps_password(client, db, google):
    user = make_user(db, is_verified=True, role="realtor")
    res = google_login(client)
    assert res.status_code == 200
    assert res.json()["user"]["id"] == user.id
    assert res.json()["user"]["role"] == "realtor"
    assert login(client, "ana@gmail.com").status_code == 200


def test_email_match_ignores_case(client, db, google):
    user = make_user(db, email="Ana@Gmail.com", is_verified=True)
    assert google_login(client).json()["user"]["id"] == user.id
    # Y el login normal tampoco distingue mayúsculas
    assert login(client, "ana@gmail.com").status_code == 200


def test_unverified_account_is_taken_over_by_the_real_owner(client, db, google):
    """Alguien registró el correo con su contraseña sin verificarlo: esa contraseña deja de valer."""
    user = make_user(db, is_verified=False)
    res = google_login(client)
    assert res.status_code == 200 and res.json()["user"]["id"] == user.id
    db.refresh(user)
    assert user.is_verified is True
    assert login(client, "ana@gmail.com").status_code == 401


def test_inactive_account_is_refused(client, db, google):
    make_user(db, is_verified=True, is_active=False)
    assert google_login(client).status_code == 403


def test_invalid_token_is_refused_and_rate_limited(client, google):
    google(ValueError("firma no válida"))
    assert google_login(client).status_code == 401
    codes = [google_login(client).status_code for _ in range(40)]
    assert codes[-1] == 429


def test_google_unreachable_returns_503(client, google):
    google(TransportError("sin conexión"))
    assert google_login(client).status_code == 503


def test_credential_length_is_validated(client, google):
    assert client.post("/api/auth/google", json={"credential": "corto"}).status_code == 422


def test_verify_checks_audience_and_verified_email(monkeypatch):
    calls = {}

    def fake_verify(token, request, audience):
        calls["audience"] = audience
        return {"email": "ana@gmail.com", "email_verified": False}

    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setattr(google_auth.id_token, "verify_oauth2_token", fake_verify)
    with pytest.raises(ValueError):
        google_auth.verify_google_credential(CREDENTIAL)
    assert calls["audience"] == CLIENT_ID


def test_verify_requires_client_id(monkeypatch):
    monkeypatch.setattr(google_auth, "GOOGLE_CLIENT_ID", "")
    with pytest.raises(ValueError):
        google_auth.verify_google_credential(CREDENTIAL)


# --- Cuentas del equipo (STAFF_ROLES) ---

def test_staff_emails_get_their_role(client, db, google):
    # Inmobiliaria del equipo con Google: aprobada aunque elija "usuario"
    google(google_info(email="Tatiana@AmiFincas.es"))
    user = google_login(client, role="user", accept_terms=True).json()["user"]
    assert (user["role"], user["is_approved"]) == ("realtor", True)

    # Cuenta ya existente con contraseña: sube de rol al entrar
    make_user(db, email="sistemas@amifincas.es", is_verified=True)
    assert login(client, "sistemas@amifincas.es").json()["user"]["role"] == "admin"


def test_staff_roles_never_lower_a_role(client, db, google):
    make_user(db, email="info@amifincas.es", role="admin", is_verified=True)
    assert login(client, "info@amifincas.es").json()["user"]["role"] == "admin"
    google(google_info(email="info@amifincas.es"))
    assert google_login(client).json()["user"]["role"] == "admin"


def test_staff_emails_cannot_self_register_or_be_taken_over(client, db, make_user):
    # Alta con contraseña de un correo del equipo: alguien podría hacerlo antes que el equipo y quedarse la cuenta
    r = client.post("/api/auth/register", json={"email": "sistemas@amifincas.es", "password": "pw123456", "accept_terms": True})
    assert r.status_code == 403 and "Google" in r.json()["detail"]
    assert db.query(models.User).filter(models.User.email == "sistemas@amifincas.es").count() == 0
    # Una cuenta así creada antes del arreglo no se activa con el enlace del correo
    planted = make_user(email="info@amifincas.es", verified=False)
    token = create_access_token({"sub": str(planted.id), "type": "verify"})
    assert client.get("/api/auth/verify-email", params={"token": token}).status_code == 403
    db.refresh(planted)
    assert planted.is_verified is False
    # Ni cambiando el correo de otra cuenta a uno del equipo
    other = make_user(email="otro@example.com")
    r = client.post("/api/auth/change-email", json={"new_email": "tatiana@amifincas.es", "password": "secret123"}, headers=auth(other))
    assert r.status_code == 403


def test_staff_roles_setting_is_parsed_safely():
    from config import _parse_staff_roles
    assert _parse_staff_roles(" A@x.es:admin , b@x.es:realtor, c@x.es:superuser, :admin, d@x.es") == {
        "a@x.es": "admin", "b@x.es": "realtor"}


# --- Aviso de inmobiliarias pendientes de aprobar ---

@pytest.fixture
def sent(monkeypatch):
    calls = []

    async def fake_send(email_to, subject, html, reply_to=None):
        calls.append((email_to, subject))
        return {"status": "skipped"}

    monkeypatch.setattr(auth_router, "send_email_resend", fake_send)
    return calls


def test_google_realtor_signup_notifies_the_validator(client, google, sent):
    google(google_info(email="inmo@gmail.com", name="Inmo Sur"))
    r = google_login(client, role="realtor", accept_terms=True)
    assert r.status_code == 200
    assert sent == [("sistemas@amifincas.es", "[Ubica] Nueva inmobiliaria pendiente de aprobar - Inmo Sur")]
    # Entrar de nuevo no repite el aviso, y un usuario normal no lo genera
    google_login(client)
    google(google_info(email="normal@gmail.com"))
    google_login(client, role="user", accept_terms=True)
    assert len(sent) == 1


def test_realtor_verifying_email_notifies_the_validator(client, db, sent):
    realtor = make_user(db, email="inmo2@gmail.com", role="realtor", is_verified=False, is_approved=False, full_name="Inmo Dos")
    token = create_access_token({"sub": str(realtor.id), "type": "verify"})
    assert client.get("/api/auth/verify-email", params={"token": token}).status_code == 200
    assert sent == [("sistemas@amifincas.es", "[Ubica] Nueva inmobiliaria pendiente de aprobar - Inmo Dos")]


def test_admin_dashboard_counts_pending_realtors(client, db):
    make_user(db, email="p1@gmail.com", role="realtor", is_approved=False)
    make_user(db, email="p2@gmail.com", role="realtor", is_approved=True)
    admin = make_user(db, email="jefe@example.com", role="admin")
    assert client.get("/api/admin/dashboard", headers=auth(admin)).json()["pending_realtors"] == 1
