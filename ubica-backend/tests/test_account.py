"""Cuenta (cambio/recuperación de contraseña, cambio de email, fuerza bruta), contacto,
vista pública de anuncios, paneles con datos reales y límites de entrada."""
import json
import re
from datetime import datetime

import bcrypt
import pytest
from starlette.requests import Request

import models
from conftest import auth
from security import create_access_token, password_fingerprint
from services.ratelimit import get_client_ip

PASSWORD = "secret123"
_FAST_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(4)).decode()


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def login(client, email, password=PASSWORD, **kw):
    return client.post("/api/auth/login", json={"email": email, "password": password}, **kw)


@pytest.fixture
def fast_user(db):
    """Usuario con bcrypt de coste mínimo: los tests de fuerza bruta hacen muchos logins."""
    def _make(email="user@example.com", role="user", **kw):
        user = models.User(email=email, role=role, hashed_password=_FAST_HASH, **kw)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return _make


@pytest.fixture
def sent(monkeypatch):
    """Sustituye el envío de correos y guarda cada llamada."""
    calls = []

    async def fake_send(email_to, subject, html, reply_to=None):
        calls.append({"to": email_to, "subject": subject, "html": html, "reply_to": reply_to})
        return {"status": "skipped"}

    import routers.auth
    import routers.contact
    monkeypatch.setattr(routers.auth, "send_email_resend", fake_send)
    monkeypatch.setattr(routers.contact, "send_email_resend", fake_send)
    return calls


def token_from(html, path):
    return re.search(rf"/{path}\?token=([\w\-.]+)", html).group(1)


def reload(db, user):
    db.expire_all()
    return db.get(models.User, user.id)


# --- Cambio de contraseña ---

def test_change_password(client, fast_user, db):
    user = fast_user()
    old = login(client, user.email).json()["access_token"]
    body = {"current_password": "mala", "new_password": "nueva-clave-1"}
    r = client.post("/api/auth/change-password", json=body, headers=bearer(old))
    assert r.status_code == 400 and r.json()["detail"] == "La contraseña actual no es correcta"
    body = {"current_password": PASSWORD, "new_password": "corta"}
    assert client.post("/api/auth/change-password", json=body, headers=bearer(old)).status_code == 422
    assert client.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "nueva-clave-1"}).status_code == 401

    r = client.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "nueva-clave-1"}, headers=bearer(old))
    assert r.status_code == 200
    data = r.json()
    assert data["token_type"] == "bearer" and data["user"]["email"] == user.email and "hashed_password" not in data["user"]
    # El token anterior queda revocado; el nuevo funciona
    assert client.get("/api/auth/me", headers=bearer(old)).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(data["access_token"])).status_code == 200
    assert login(client, user.email).status_code == 401
    assert login(client, user.email, "nueva-clave-1").status_code == 200


# --- Recuperación de contraseña ---

FORGOT_MESSAGE = "Si el email está registrado, te hemos enviado un enlace para restablecer la contraseña."


def test_forgot_and_reset_password_single_use(client, fast_user, db, sent):
    user = fast_user(full_name="<b>Ana</b>", is_verified=False)
    session_token = create_access_token({"sub": str(user.id), "type": "access", "pv": password_fingerprint(_FAST_HASH)})

    r = client.post("/api/auth/forgot-password", json={"email": "USER@example.com"})
    assert r.status_code == 200 and r.json() == {"message": FORGOT_MESSAGE}
    [mail] = sent
    assert mail["to"] == user.email and "http://localhost:5173/reset-password?token=" in mail["html"]
    assert "<b>Ana</b>" not in mail["html"] and "&lt;b&gt;Ana&lt;/b&gt;" in mail["html"]
    token = token_from(mail["html"], "reset-password")
    # El enlace no es una sesión
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401

    assert client.post("/api/auth/reset-password", json={"token": token, "new_password": "corta"}).status_code == 422
    r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "nueva-clave-1"})
    assert r.status_code == 200 and r.json()["message"]
    u = reload(db, user)
    assert u.is_verified is True and bcrypt.checkpw(b"nueva-clave-1", u.hashed_password.encode())
    assert login(client, user.email, "nueva-clave-1").status_code == 200
    # Las sesiones anteriores se cierran y el enlace ya no sirve
    assert client.get("/api/auth/me", headers=bearer(session_token)).status_code == 401
    r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "otra-clave-2"})
    assert r.status_code == 400 and r.json()["detail"] == "El enlace no es válido o ha caducado"


def test_forgot_password_does_not_reveal_accounts(client, fast_user, sent):
    fast_user(email="off@example.com", is_active=False)
    for email in ("nadie@example.com", "off@example.com"):
        r = client.post("/api/auth/forgot-password", json={"email": email})
        assert r.status_code == 200 and r.json() == {"message": FORGOT_MESSAGE}
    assert sent == []


def test_forgot_password_rate_limited_silently(client, fast_user, sent):
    fast_user()
    for _ in range(5):
        r = client.post("/api/auth/forgot-password", json={"email": "user@example.com"})
        assert r.status_code == 200 and r.json() == {"message": FORGOT_MESSAGE}
    assert len(sent) == 3


@pytest.mark.parametrize("kind", ["garbage", "expired", "access", "no_pv", "other_secret", "inactive"])
def test_reset_password_rejects_bad_tokens(kind, client, fast_user):
    import jwt
    user = fast_user(is_active=kind != "inactive")
    pv = password_fingerprint(_FAST_HASH)
    token = {
        "garbage": "abc.def.ghi",
        "expired": create_access_token({"sub": str(user.id), "type": "reset", "pv": pv}, expires_minutes=-1),
        "access": create_access_token({"sub": str(user.id), "type": "access", "pv": pv}),
        "no_pv": create_access_token({"sub": str(user.id), "type": "reset"}),
        "other_secret": jwt.encode({"sub": str(user.id), "type": "reset", "pv": pv}, "otra", algorithm="HS256"),
        "inactive": create_access_token({"sub": str(user.id), "type": "reset", "pv": pv}),
    }[kind]
    r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "nueva-clave-1"})
    assert r.status_code == 400 and r.json()["detail"] == "El enlace no es válido o ha caducado"


def test_reset_token_expires_in_60_minutes(client, fast_user, sent):
    import jwt
    fast_user()
    client.post("/api/auth/forgot-password", json={"email": "user@example.com"})
    payload = jwt.decode(token_from(sent[0]["html"], "reset-password"), "test-secret", algorithms=["HS256"])
    minutes = (datetime.utcfromtimestamp(payload["exp"]) - datetime.utcnow()).total_seconds() / 60
    assert payload["type"] == "reset" and 58 < minutes <= 60


# --- Cambio de email ---

def test_change_email_flow(client, fast_user, db, sent):
    user = fast_user()
    fast_user(email="taken@example.com")
    h = auth(user)
    r = client.post("/api/auth/change-email", json={"new_email": "nuevo@example.com", "password": "mala"}, headers=h)
    assert r.status_code == 400
    r = client.post("/api/auth/change-email", json={"new_email": "TAKEN@example.com", "password": PASSWORD}, headers=h)
    assert r.status_code == 400 and r.json()["detail"] == "El email ya está registrado"
    assert client.post("/api/auth/change-email", json={"new_email": "nuevo@example.com", "password": PASSWORD}).status_code == 401
    assert sent == []

    r = client.post("/api/auth/change-email", json={"new_email": "nuevo@example.com", "password": PASSWORD}, headers=h)
    assert r.status_code == 200 and r.json() == {"message": "Te hemos enviado un enlace de confirmación a nuevo@example.com"}
    [mail] = sent
    assert mail["to"] == "nuevo@example.com" and "/confirm-email-change?token=" in mail["html"]
    assert reload(db, user).email == "user@example.com"  # aún no cambia
    token = token_from(mail["html"], "confirm-email-change")
    assert client.get("/api/auth/me", headers=bearer(token)).status_code == 401

    r = client.get("/api/auth/confirm-email-change", params={"token": token})
    assert r.status_code == 200 and r.json()["message"]
    assert reload(db, user).email == "nuevo@example.com"
    assert client.get("/api/auth/me", headers=h).json()["email"] == "nuevo@example.com"
    assert login(client, "nuevo@example.com").status_code == 200
    assert login(client, "user@example.com").status_code == 401
    assert client.get("/api/auth/confirm-email-change", params={"token": token}).status_code == 200  # idempotente


def test_change_email_stale_or_invalid_links(client, fast_user, db, sent):
    user = fast_user()
    h = auth(user)
    for email in ("a@example.com", "b@example.com", "c@example.com"):
        client.post("/api/auth/change-email", json={"new_email": email, "password": PASSWORD}, headers=h)
    link_a, link_b, link_c = (token_from(m["html"], "confirm-email-change") for m in sent)
    assert client.get("/api/auth/confirm-email-change", params={"token": link_b}).status_code == 200
    # Pedidos con el email anterior: ya no valen
    for stale in (link_a, link_c):
        assert client.get("/api/auth/confirm-email-change", params={"token": stale}).status_code == 400
    assert reload(db, user).email == "b@example.com"

    # Si alguien ocupa el email entre la solicitud y la confirmación
    client.post("/api/auth/change-email", json={"new_email": "y@example.com", "password": PASSWORD}, headers=h)
    link_y = token_from(sent[-1]["html"], "confirm-email-change")
    fast_user(email="Y@example.com")
    r = client.get("/api/auth/confirm-email-change", params={"token": link_y})
    assert r.status_code == 400 and r.json()["detail"] == "El email ya está registrado"

    # Un cambio de contraseña invalida los enlaces pendientes
    client.post("/api/auth/change-email", json={"new_email": "w@example.com", "password": PASSWORD}, headers=h)
    link_w = token_from(sent[-1]["html"], "confirm-email-change")
    client.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "nueva-clave-1"}, headers=h)
    assert client.get("/api/auth/confirm-email-change", params={"token": link_w}).status_code == 400
    assert client.get("/api/auth/confirm-email-change", params={"token": "basura"}).status_code == 400
    assert reload(db, user).email == "b@example.com"


# --- Fuerza bruta en el login ---

TOO_MANY = "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."


def test_login_locked_per_email_after_10_failures(client, fast_user):
    fast_user()
    fast_user(email="otro@example.com")
    for _ in range(10):
        assert login(client, "user@example.com", "mala").status_code == 401
    # Bloqueado aunque la contraseña sea correcta, y sin importar mayúsculas
    r = login(client, "USER@example.com")
    assert r.status_code == 429 and r.json()["detail"] == TOO_MANY
    assert login(client, "user@example.com").status_code == 429
    assert login(client, "otro@example.com").status_code == 200


def test_successful_login_clears_email_counter(client, fast_user):
    fast_user()
    for _ in range(9):
        login(client, "user@example.com", "mala")
    assert login(client, "user@example.com").status_code == 200
    for _ in range(9):
        assert login(client, "user@example.com", "mala").status_code == 401
    assert login(client, "user@example.com").status_code == 200


def test_login_locked_per_ip_after_30_failures(client, fast_user, monkeypatch):
    import security
    monkeypatch.setattr(security, "_DUMMY_HASH", _FAST_HASH)
    fast_user()
    ip = {"X-Forwarded-For": "203.0.113.7, 10.0.0.1"}
    for i in range(30):
        assert login(client, f"nadie{i}@example.com", "x", headers=ip).status_code == 401
    assert login(client, "user@example.com", headers=ip).status_code == 429
    assert login(client, "user@example.com", headers={"X-Forwarded-For": "198.51.100.1"}).status_code == 200


def test_unknown_email_still_runs_bcrypt(client, fast_user, monkeypatch):
    import routers.auth
    calls = []
    monkeypatch.setattr(routers.auth, "burn_password_check", calls.append)
    fast_user()
    assert login(client, "nadie@example.com", "x").status_code == 401
    assert calls == ["x"]
    assert login(client, "user@example.com", "mala").status_code == 401
    assert calls == ["x"]


def _request(headers, client=("10.1.1.1", 1234)):
    scope = {"type": "http", "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()], "client": client}
    return Request(scope)


def test_get_client_ip_prefers_proxy_headers():
    xff = {"X-Forwarded-For": " 203.0.113.7 , 10.0.0.1"}
    assert get_client_ip(_request({"CF-Connecting-IP": "1.1.1.1", "True-Client-IP": "2.2.2.2", **xff})) == "1.1.1.1"
    assert get_client_ip(_request({"True-Client-IP": "2.2.2.2", **xff})) == "2.2.2.2"
    assert get_client_ip(_request(xff)) == "203.0.113.7"
    assert get_client_ip(_request({})) == "10.1.1.1"
    assert get_client_ip(_request({}, client=None)) == "unknown"


def test_ai_guest_quota_uses_client_ip(client):
    a, b = {"CF-Connecting-IP": "1.1.1.1"}, {"CF-Connecting-IP": "2.2.2.2"}
    for _ in range(15):
        assert client.post("/api/ai/chat", json={"message": "hola"}, headers=a).status_code == 200
    assert client.post("/api/ai/chat", json={"message": "hola"}, headers=a).status_code == 429
    assert client.post("/api/ai/chat", json={"message": "hola"}, headers=b).status_code == 200


# --- Contacto ---

CONTACT = {"name": "Ana <script>", "email": "ana@example.com", "phone": "600 000 000", "subject": "Piso & garaje",
           "message": "Hola,\n<b>quiero</b> información"}


def test_contact_sends_escaped_email(client, sent, monkeypatch):
    import routers.contact
    monkeypatch.setattr(routers.contact, "CONTACT_EMAIL", "buzon@example.com")
    r = client.post("/api/contact", json=CONTACT)
    assert r.status_code == 200 and r.json() == {"message": "Mensaje enviado. Te responderemos lo antes posible."}
    [mail] = sent
    assert mail["to"] == "buzon@example.com" and mail["reply_to"] == "ana@example.com"
    assert "<script>" not in mail["html"] and "<b>quiero</b>" not in mail["html"]
    assert "Ana &lt;script&gt;" in mail["html"] and "Piso &amp; garaje" in mail["html"] and "&lt;b&gt;quiero&lt;/b&gt;" in mail["html"]
    assert "600 000 000" in mail["html"]


def test_contact_from_ami_fincas_is_labelled(client, sent):
    body = {"name": "Ana", "email": "ana@example.com", "subject": "Presupuesto: comunidad", "message": "Somos 24 viviendas en Murcia", "source": "ami"}
    assert client.post("/api/contact", json=body).status_code == 200
    assert sent[0]["subject"].startswith("[AMI Fincas] Presupuesto: comunidad")
    assert client.post("/api/contact", json={**body, "source": "otra"}).status_code == 422


def test_contact_validation(client, sent):
    ok = {"name": "Ana", "email": "ana@example.com", "message": "Mensaje suficientemente largo"}
    assert client.post("/api/contact", json=ok).status_code == 200  # teléfono y asunto opcionales
    for bad in ({"name": ""}, {"name": "   "}, {"name": "x" * 201}, {"email": "no-es-email"}, {"message": "corto"},
                {"message": "x" * 5001}, {"subject": "x" * 201}):
        assert client.post("/api/contact", json={**ok, **bad}).status_code == 422, bad
    assert len(sent) == 1


def test_contact_rate_limited_per_ip(client, sent):
    ip = {"X-Forwarded-For": "203.0.113.9"}
    body = {"name": "Ana", "email": "ana@example.com", "message": "Mensaje suficientemente largo"}
    for _ in range(5):
        assert client.post("/api/contact", json=body, headers=ip).status_code == 200
    assert client.post("/api/contact", json=body, headers=ip).status_code == 429
    assert client.post("/api/contact", json=body, headers={"X-Forwarded-For": "203.0.113.10"}).status_code == 200
    assert len(sent) == 6


def test_contact_reports_send_failure(client, monkeypatch):
    import routers.contact

    async def failing(*args, **kwargs):
        return {"status": "error", "message": "boom"}
    monkeypatch.setattr(routers.contact, "send_email_resend", failing)
    r = client.post("/api/contact", json={"name": "Ana", "email": "ana@example.com", "message": "Mensaje suficientemente largo"})
    assert r.status_code == 502


def test_send_email_resend_maps_reply_to(monkeypatch):
    import asyncio
    import services.email as email
    posted = []

    class FakeResponse:
        status = 200
        async def __aenter__(self):
            return self
        async def __aexit__(self, *exc):
            return False
        async def json(self):
            return {"id": "abc"}

    class FakeSession:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *exc):
            return False
        def post(self, url, json, headers):
            posted.append(json)
            return FakeResponse()

    monkeypatch.setattr(email, "RESEND_API_KEY", "re_test")
    monkeypatch.setattr(email.aiohttp, "ClientSession", FakeSession)
    assert asyncio.run(email.send_email_resend("a@example.com", "Hola", "<p>x</p>", reply_to="b@example.com"))["status"] == "success"
    assert asyncio.run(email.send_email_resend("a@example.com", "Hola", "<p>x</p>"))["status"] == "success"
    assert posted[0]["reply_to"] == "b@example.com" and "reply_to" not in posted[1]


# --- Vista pública de anuncios ---

PRIVATE = {"purchase_price", "total_cost", "monthly_cost", "monthly_income", "owner_id", "realtor_id"}


def test_public_views_hide_private_fields(client, make_user, make_property):
    owner = make_user(email="owner@example.com")
    realtor = make_user(email="realtor@example.com", role="realtor")
    admin = make_user(email="admin@example.com", role="admin")
    other = make_user(email="other@example.com")
    prop = make_property(owner_id=owner.id, realtor_id=realtor.id, purchase_price=90000, total_cost=95000, monthly_cost=100, monthly_income=800,
                         images=["https://example.com/a.jpg"], features=["Piscina"])

    [listed] = client.get("/api/properties").json()
    assert not PRIVATE & set(listed) and listed["images"] == ["https://example.com/a.jpg"] and listed["features"] == ["Piscina"]
    for h in ({}, auth(other)):
        detail = client.get(f"/api/properties/{prop.id}", headers=h).json()
        assert not PRIVATE & set(detail) and detail["title"] == prop.title
    for user in (owner, realtor, admin):
        detail = client.get(f"/api/properties/{prop.id}", headers=auth(user)).json()
        assert detail["purchase_price"] == 90000 and detail["monthly_income"] == 800 and detail["owner_id"] == owner.id

    client.post(f"/api/user/favorites/{prop.id}", headers=auth(other))
    [fav] = client.get("/api/user/favorites", headers=auth(other)).json()
    assert fav["id"] == prop.id and not PRIVATE & set(fav)


def test_ai_obtener_detalles_hides_private_fields(make_user, make_property):
    import asyncio
    from services.ai import tools
    owner = make_user(email="owner@example.com")
    other = make_user(email="other@example.com")
    prop = make_property(owner_id=owner.id, purchase_price=90000, monthly_income=800)
    draft = make_property(owner_id=owner.id, status="draft")

    def detalles(pid, user_id, role):
        return json.loads(asyncio.run(tools.execute_tool("obtener_detalles", {"propiedad_id": pid}, user_id, role)))

    for user_id, role in ((None, "guest"), (other.id, "user")):
        d = detalles(prop.id, user_id, role)
        assert d["title"] == prop.title and not PRIVATE & set(d)
        assert "error" in detalles(draft.id, user_id, role)
    assert detalles(prop.id, owner.id, "user")["purchase_price"] == 90000
    assert detalles(draft.id, owner.id, "user")["owner_id"] == owner.id
    assert detalles(prop.id, 9999, "admin")["monthly_income"] == 800


def test_property_listing_pagination(client, make_property):
    for i in range(25):
        make_property(title=f"P{i}")
    assert len(client.get("/api/properties").json()) == 20
    assert len(client.get("/api/properties?limit=100").json()) == 25
    assert [p["title"] for p in client.get("/api/properties?skip=24&limit=1").json()] == ["P24"]
    for url in ("/api/properties?limit=0", "/api/properties?limit=101", "/api/properties?skip=-1"):
        assert client.get(url).status_code == 422


# --- Paneles ---

def _investment(db, investor_id, property_id, amount, value, roi, rent, yield_, appreciation):
    inv = models.Investment(property_id=property_id, investor_id=investor_id, investment_amount=amount, current_value=value,
                            purchase_price=amount, purchase_date=datetime(2024, 1, 1), roi_percentage=roi, annual_rental_income=rent,
                            rental_yield=yield_, appreciation_rate=appreciation, holding_period_months=12)
    db.add(inv)
    db.commit()
    return inv


def test_admin_dashboard_from_db(client, make_user, make_property, db):
    admin = make_user(email="admin@example.com", role="admin")
    investor = make_user(email="inv@example.com", role="investor")
    make_user(email="r@example.com", role="realtor")
    make_user(email="u@example.com")
    p = make_property(status="sold")
    make_property(status="rented")
    make_property(status="sold", updated_at=datetime(2000, 1, 1))  # vendida hace tiempo
    make_property()
    _investment(db, investor.id, p.id, 100000, 120000, 10, 6000, 6, 3)
    _investment(db, investor.id, p.id, 50000, 50000, 4, 3000, 6, 1)

    dash = client.get("/api/admin/dashboard", headers=auth(admin)).json()
    assert dash["total_users"] == 4 and dash["total_properties"] == 4
    assert dash["total_transactions"] == 2 and dash["total_revenue"] == 150000 and dash["average_roi"] == 7
    assert dash["properties_sold_this_month"] == 1 and dash["properties_rented_this_month"] == 1
    assert dash["market_growth"] == 0
    assert dash["users_by_role"] == {"admin": 1, "realtor": 1, "investor": 1, "user": 1}
    assert dash["properties_by_status"] == {"sold": 2, "rented": 1, "for-sale": 1}


def test_admin_dashboard_empty(client, make_user):
    dash = client.get("/api/admin/dashboard", headers=auth(make_user(role="admin"))).json()
    assert dash["users_by_role"] == {"admin": 1, "realtor": 0, "investor": 0, "user": 0}
    assert dash["properties_by_status"] == {} and dash["total_revenue"] == 0 and dash["average_roi"] == 0


def test_investor_dashboard_from_investments(client, make_user, make_property, db):
    investor = make_user(role="investor")
    other = make_user(email="o@example.com", role="investor")
    p = make_property()
    _investment(db, investor.id, p.id, 100000, 120000, 10, 6000, 6, 3)
    _investment(db, investor.id, p.id, 50000, 60000, 20, 3000, 8, 5)
    _investment(db, other.id, p.id, 999999, 999999, 99, 99999, 99, 99)
    dash = client.get("/api/investor/dashboard", headers=auth(investor)).json()
    assert dash == {"portfolio_value": 180000, "total_properties": 2, "monthly_income": 750, "average_roi": 15,
                    "total_investment": 150000, "unrealized_gains": 30000, "rental_yield": 7, "appreciation_rate": 4}


def test_realtor_dashboard_from_portfolio(client, make_user, make_property):
    realtor = make_user(role="realtor")
    make_property(owner_id=realtor.id, status="sold", price=100000)
    make_property(realtor_id=realtor.id, status="sold", price=300000, updated_at=datetime(2000, 1, 1))
    make_property(realtor_id=realtor.id, status="rented", price=900)
    make_property(owner_id=realtor.id, status="for-sale", price=5)
    make_property(status="sold", price=1)  # de otro
    dash = client.get("/api/realtor/dashboard", headers=auth(realtor)).json()
    assert dash == {"total_properties": 4, "properties_sold": 2, "properties_rented": 1, "this_month_sales": 1,
                    "this_month_rentals": 1, "avg_sale_price": 200000}


# --- Juegos y salud ---

def test_game_score_bounds(client, make_user):
    u = make_user()
    h = auth(u)
    # Partida empezada hace mucho: solo queda el tope de La Torre (5000)
    token = create_access_token({"sub": str(u.id), "type": "game", "game": "balance", "started": 0})

    def body(score):
        return {"game_name": "balance", "score": score, "session_token": token}
    assert client.post("/api/games/score", json=body(5000), headers=h).status_code == 200
    for score in (5001, 10_000_001, -1, 5.5, "5", True):
        assert client.post("/api/games/score", json=body(score), headers=h).status_code == 422, score
    assert client.get("/api/games/balance/leaderboard?limit=50").status_code == 200
    for limit in (0, 51):
        assert client.get(f"/api/games/balance/leaderboard?limit={limit}").status_code == 422


def test_health_hides_user_count(client, make_user):
    make_user()
    body = client.get("/health").json()
    assert set(body) == {"status", "timestamp", "version", "database", "total_properties"}
