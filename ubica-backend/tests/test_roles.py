"""Permisos rol × endpoint, IDOR y flujos completos por rol.

Actores: guest (sin token), user, realtor, investor, admin.

Las expectativas salen del código:
- security.get_current_user        -> 401 sin token o token inválido
- security.require_role([...])     -> 401 sin token, 403 si el rol no está en la lista
- security.get_user_or_none        -> público; el token solo personaliza (chat IA)
- Las dependencias se resuelven antes que la validación del cuerpo/ruta: un invitado
  recibe 401 aunque el cuerpo sea inválido, y un usuario autenticado recibe 422.

Los errores conocidos (y los nuevos encontrados) están marcados con
xfail(strict=True): cuando se arreglen, el test pasará y pytest avisará para quitar la marca.
"""
import json
import os
from datetime import datetime, timedelta

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session, func, select

import models
from conftest import app, auth, engine
from security import create_access_token, password_fingerprint
from services.properties import get_allowed_properties_statement

ROLES = ["guest", "user", "realtor", "investor", "admin"]
LOGGED_ROLES = ROLES[1:]
PASSWORD = "secret123"
# bcrypt con coste mínimo y calculado una sola vez: la matriz crea cientos de usuarios
_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt(4)).decode()
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
JPG = b"\xff\xd8\xff\xe0" + b"\x00" * 32
PUBLIC_STATUSES = {"for-sale", "for-rent", "reserved", "available"}  # services/properties.py


def xfail_known(reason):
    return pytest.mark.xfail(strict=True, reason=f"[conocido] {reason}")


def xfail_new(reason):
    return pytest.mark.xfail(strict=True, reason=f"[nuevo] {reason}")


@pytest.fixture
def client():
    # Los errores del servidor deben verse como 500, no como excepción en el test
    return TestClient(app, raise_server_exceptions=False)


# --------------------------------------------------------------------------
# Ayudantes de base de datos (cada lectura usa una sesión nueva: ve lo que
# han confirmado las peticiones a la API)
# --------------------------------------------------------------------------

def add(db, obj):
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def new_user(db, email, role="user", verified=True, **kw):
    return add(db, models.User(email=email, role=role, hashed_password=_HASH, is_verified=verified, **kw))


def new_prop(db, **kw):
    data = {"title": "Piso en Cartagena", "price": 150000, "type": "apartment", "status": "for-sale", "city": "Cartagena", "area": 90}
    data.update(kw)
    return add(db, models.Property(**data))


def fetch(model, obj_id):
    with Session(engine) as s:
        obj = s.get(model, obj_id)
        if obj is not None:
            s.expunge(obj)
        return obj


def rows(model, **where):
    with Session(engine) as s:
        stmt = select(model)
        for key, value in where.items():
            stmt = stmt.where(getattr(model, key) == value)
        out = s.exec(stmt).all()
        for o in out:
            s.expunge(o)
        return out


def count(model):
    with Session(engine) as s:
        return s.exec(select(func.count()).select_from(model)).one()


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def login(client, email, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def ok(r):
    return 200 <= r.status_code < 300


def test_sqlite_enforces_foreign_keys():
    with engine.connect() as conn:
        assert conn.execute(text("PRAGMA foreign_keys")).scalar() == 1


# ==========================================================================
# 1. MATRIZ DE PERMISOS: cada ruta de app.openapi() × cada actor
# ==========================================================================

MATRIX = {
    # (método, ruta)                                       guest user realtor investor admin
    ("POST",   "/api/auth/login"):                          (200, 200, 200, 200, 200),
    ("POST",   "/api/auth/register"):                       (200, 200, 200, 200, 200),
    ("GET",    "/api/auth/verify-email"):                   (200, 200, 200, 200, 200),
    ("GET",    "/api/auth/me"):                             (401, 200, 200, 200, 200),
    ("POST",   "/api/auth/change-password"):                (401, 200, 200, 200, 200),
    ("POST",   "/api/auth/forgot-password"):                (200, 200, 200, 200, 200),
    ("GET",    "/api/auth/google/config"):                  (200, 200, 200, 200, 200),
    # Sin GOOGLE_CLIENT_ID (como en los tests) el acceso con Google no existe; el alta y la vinculación
    # se prueban en test_google_auth.py con el Client ID activado
    ("POST",   "/api/auth/google"):                         (404, 404, 404, 404, 404),
    ("POST",   "/api/auth/reset-password"):                 (200, 200, 200, 200, 200),
    ("POST",   "/api/auth/change-email"):                   (401, 200, 200, 200, 200),
    ("GET",    "/api/auth/confirm-email-change"):           (200, 200, 200, 200, 200),
    ("POST",   "/api/contact"):                             (200, 200, 200, 200, 200),
    ("POST",   "/api/upload-images"):                       (401, 200, 200, 200, 200),
    ("GET",    "/api/properties"):                          (200, 200, 200, 200, 200),
    ("GET",    "/api/properties/{property_id}"):            (200, 200, 200, 200, 200),
    ("GET",    "/api/stats/market"):                        (200, 200, 200, 200, 200),
    ("GET",    "/api/admin/dashboard"):                     (401, 403, 403, 403, 200),
    ("GET",    "/api/admin/users"):                         (401, 403, 403, 403, 200),
    ("POST",   "/api/admin/users"):                         (401, 403, 403, 403, 200),
    ("PUT",    "/api/admin/users/{user_id}"):               (401, 403, 403, 403, 200),
    ("DELETE", "/api/admin/users/{user_id}"):               (401, 403, 403, 403, 200),
    ("GET",    "/api/admin/properties"):                    (401, 403, 403, 403, 200),
    ("POST",   "/api/admin/properties"):                    (401, 403, 403, 403, 200),
    ("POST",   "/api/admin/properties/import"):             (401, 403, 403, 403, 200),
    ("PUT",    "/api/admin/properties/{property_id}"):      (401, 403, 403, 403, 200),
    ("DELETE", "/api/admin/properties/{property_id}"):      (401, 403, 403, 403, 200),
    ("GET",    "/api/user/properties"):                     (401, 200, 200, 200, 200),
    ("POST",   "/api/user/properties"):                     (401, 200, 200, 200, 200),
    ("PUT",    "/api/user/properties/{property_id}"):       (401, 200, 200, 200, 200),
    ("DELETE", "/api/user/properties/{property_id}"):       (401, 200, 200, 200, 200),
    ("GET",    "/api/user/favorites"):                      (401, 200, 200, 200, 200),
    ("POST",   "/api/user/favorites/{property_id}"):        (401, 200, 200, 200, 200),
    ("DELETE", "/api/user/favorites/{property_id}"):        (401, 200, 200, 200, 200),
    ("GET",    "/api/user/searches"):                       (401, 200, 200, 200, 200),
    ("POST",   "/api/user/searches"):                       (401, 200, 200, 200, 200),
    ("DELETE", "/api/user/searches/{search_id}"):           (401, 200, 200, 200, 200),
    ("GET",    "/api/user/messages"):                       (401, 200, 200, 200, 200),
    ("POST",   "/api/user/messages"):                       (401, 200, 200, 200, 200),
    ("GET",    "/api/user/messages/received"):              (401, 200, 200, 200, 200),
    ("GET",    "/api/user/conversations"):                  (401, 200, 200, 200, 200),
    ("POST",   "/api/user/messages/{message_id}/reply"):    (401, 200, 200, 200, 200),
    ("POST",   "/api/games/score"):                         (401, 200, 200, 200, 200),
    ("GET",    "/api/games/{game_name}/leaderboard"):       (200, 200, 200, 200, 200),
    ("POST",   "/api/games/balance/start"):                 (401, 200, 200, 200, 200),
    ("GET",    "/api/games/tasador/daily"):                 (200, 200, 200, 200, 200),
    ("POST",   "/api/games/tasador/daily/guess"):           (200, 200, 200, 200, 200),
    ("GET",    "/api/games/tasador/leaderboard"):           (200, 200, 200, 200, 200),
    ("GET",    "/api/portfolio"):                           (401, 200, 200, 200, 200),
    ("POST",   "/api/portfolio/properties"):                (401, 200, 200, 200, 200),
    ("PUT",    "/api/portfolio/properties/{prop_id}"):      (401, 200, 200, 200, 200),
    ("DELETE", "/api/portfolio/properties/{prop_id}"):      (401, 200, 200, 200, 200),
    ("PUT",    "/api/portfolio/items"):                     (401, 200, 200, 200, 200),
    ("GET",    "/api/portfolio/municipios"):                (401, 200, 200, 200, 200),
    ("GET",    "/api/realtor/dashboard"):                   (401, 403, 200, 403, 403),  # ni el admin
    ("GET",    "/api/realtor/properties"):                  (401, 403, 200, 403, 403),
    ("GET",    "/api/investor/dashboard"):                  (401, 403, 403, 200, 403),  # ni el admin
    ("GET",    "/api/investor/portfolio"):                  (401, 403, 403, 200, 403),
    ("POST",   "/api/ai/chat"):                             (200, 200, 200, 200, 200),
    ("GET",    "/api/ai/config"):                           (401, 403, 403, 403, 200),
    ("GET",    "/api/ai/conversations"):                    (401, 200, 200, 200, 200),
    ("POST",   "/api/ai/listing-draft"):                    (401, 200, 200, 200, 200),
    ("GET",    "/api/ai/conversations/{conversation_id}"):  (401, 200, 200, 200, 200),
    ("GET",    "/api/ping"):                                (200, 200, 200, 200, 200),
    # Instagram de AMI: solo el administrador y las cuentas del equipo (STAFF_ROLES); sin token configurado, 503
    ("GET",    "/api/social/instagram/{property_id}"):      (401, 403, 403, 403, 200),
    ("POST",   "/api/social/instagram/{property_id}"):      (401, 403, 403, 403, 503),
    ("GET",    "/health"):                                  (200, 200, 200, 200, 200),
}


class World:
    """Escenario mínimo de cada caso: un propietario con un anuncio público y el actor."""

    def __init__(self, db, role):
        self.db = db
        self.role = role
        owner = new_user(db, "owner@example.com", full_name="Owner")
        self.owner_id = owner.id
        self.prop_id = new_prop(db, owner_id=owner.id, title="Pública").id
        if role == "guest":
            self.actor_id, self.h = None, {}
        else:
            actor = new_user(db, f"{role}@example.com", role=role, full_name=f"Actor {role}")
            self.actor_id, self.h = actor.id, auth(actor)
        # Dueño de los recursos "propios" del caso (para el invitado, los del propietario)
        self.me = self.actor_id or self.owner_id


CASES = {}


def case(method, path):
    def register(fn):
        CASES[(method, path)] = fn
        return fn
    return register


# Cada caso devuelve (método, url, kwargs de la petición, check). check(w, r, allowed)
# comprueba en la BD que la acción ocurrió (allowed) o que no tuvo efecto.

@case("POST", "/api/auth/login")
def _(w):
    email = f"{w.role}@example.com" if w.actor_id else "owner@example.com"

    def check(w, r, allowed):
        assert r.json()["user"]["email"] == email and r.json()["access_token"]
    return "POST", "/api/auth/login", {"json": {"email": email, "password": PASSWORD}}, check


@case("POST", "/api/auth/register")
def _(w):
    email = f"new-{w.role}@example.com"

    def check(w, r, allowed):
        [u] = rows(models.User, email=email)
        assert u.id == r.json()["user_id"] and u.role == "user" and u.is_verified is False
    return "POST", "/api/auth/register", {"json": {"email": email, "password": "pw123456", "accept_terms": True}}, check


@case("GET", "/api/auth/verify-email")
def _(w):
    pending = new_user(w.db, f"pending-{w.role}@example.com", verified=False)
    token = create_access_token({"sub": str(pending.id), "type": "verify"})

    def check(w, r, allowed):
        assert fetch(models.User, pending.id).is_verified is True
    return "GET", "/api/auth/verify-email", {"params": {"token": token}}, check


@case("POST", "/api/auth/change-password")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert bcrypt.checkpw(b"clave-nueva-1", fetch(models.User, w.actor_id).hashed_password.encode())
            assert client_get_me(r.json()["access_token"]) == w.actor_id
        else:
            assert fetch(models.User, w.owner_id).hashed_password == _HASH
    return "POST", "/api/auth/change-password", {"json": {"current_password": PASSWORD, "new_password": "clave-nueva-1"}}, check


@case("POST", "/api/auth/forgot-password")
def _(w):
    def check(w, r, allowed):
        assert r.json()["message"].startswith("Si el email está registrado")
    return "POST", "/api/auth/forgot-password", {"json": {"email": "owner@example.com"}}, check


@case("GET", "/api/auth/google/config")
def _(w):
    def check(w, r, allowed):
        assert r.json() == {"client_id": None}
    return "GET", "/api/auth/google/config", {}, check


@case("POST", "/api/auth/google")
def _(w):
    users_before = count(models.User)

    def check(w, r, allowed):
        assert count(models.User) == users_before
    return "POST", "/api/auth/google", {"json": {"credential": "x" * 40}}, check


@case("POST", "/api/auth/reset-password")
def _(w):
    token = create_access_token({"sub": str(w.me), "type": "reset", "pv": password_fingerprint(_HASH)}, expires_minutes=60)

    def check(w, r, allowed):
        assert bcrypt.checkpw(b"clave-nueva-1", fetch(models.User, w.me).hashed_password.encode())
    return "POST", "/api/auth/reset-password", {"json": {"token": token, "new_password": "clave-nueva-1"}}, check


@case("POST", "/api/auth/change-email")
def _(w):
    def check(w, r, allowed):
        # Solo se envía el enlace: el email no cambia hasta confirmarlo
        assert not rows(models.User, email="nuevo@example.com")
    return "POST", "/api/auth/change-email", {"json": {"new_email": "nuevo@example.com", "password": PASSWORD}}, check


@case("GET", "/api/auth/confirm-email-change")
def _(w):
    me = fetch(models.User, w.me)
    token = create_access_token({"sub": str(me.id), "type": "email_change", "new_email": "nuevo@example.com", "email": me.email,
                                 "pv": password_fingerprint(_HASH)}, expires_minutes=60)

    def check(w, r, allowed):
        assert fetch(models.User, w.me).email == "nuevo@example.com"
    return "GET", "/api/auth/confirm-email-change", {"params": {"token": token}}, check


@case("POST", "/api/contact")
def _(w):
    def check(w, r, allowed):
        assert r.json()["message"].startswith("Mensaje enviado")
    return "POST", "/api/contact", {"json": {"name": "Ana", "email": "ana@example.com", "message": "Quiero información del piso"}}, check


@case("GET", "/api/auth/me")
def _(w):
    def check(w, r, allowed):
        if not allowed:
            return
        assert r.json()["id"] == w.actor_id and "hashed_password" not in r.json()
    return "GET", "/api/auth/me", {}, check


@case("POST", "/api/upload-images")
def _(w):
    def check(w, r, allowed):
        if allowed:
            name = r.json()["urls"][0].rsplit("/", 1)[1]
            assert os.path.exists(os.path.join(os.environ["UPLOAD_DIR"], name))
    return "POST", "/api/upload-images", {"files": {"files": ("a.png", PNG, "image/png")}}, check


@case("GET", "/api/properties")
def _(w):
    def check(w, r, allowed):
        assert [p["id"] for p in r.json()] == [w.prop_id]
    return "GET", "/api/properties", {}, check


@case("GET", "/api/properties/{property_id}")
def _(w):
    def check(w, r, allowed):
        assert r.json()["title"] == "Pública"
    return "GET", f"/api/properties/{w.prop_id}", {}, check


@case("GET", "/api/stats/market")
def _(w):
    def check(w, r, allowed):
        assert r.json()["total_properties"] == count(models.Property)
    return "GET", "/api/stats/market", {}, check


@case("GET", "/api/admin/dashboard")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert r.json()["total_users"] == count(models.User)
            assert r.json()["total_properties"] == count(models.Property)
    return "GET", "/api/admin/dashboard", {}, check


@case("GET", "/api/admin/users")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert len(r.json()) == count(models.User)
    return "GET", "/api/admin/users", {}, check


@case("POST", "/api/admin/users")
def _(w):
    email = f"created-by-{w.role}@example.com"

    def check(w, r, allowed):
        created = rows(models.User, email=email)
        assert len(created) == (1 if allowed else 0)
        if allowed:
            assert created[0].role == "realtor"
    return "POST", "/api/admin/users", {"json": {"email": email, "password": "pw123456", "role": "realtor"}}, check


@case("PUT", "/api/admin/users/{user_id}")
def _(w):
    victim = new_user(w.db, "victim@example.com", full_name="Víctima")

    def check(w, r, allowed):
        assert fetch(models.User, victim.id).full_name == ("Renombrado" if allowed else "Víctima")
    return "PUT", f"/api/admin/users/{victim.id}", {"json": {"full_name": "Renombrado"}}, check


@case("DELETE", "/api/admin/users/{user_id}")
def _(w):
    victim = new_user(w.db, "victim@example.com")

    def check(w, r, allowed):
        assert (fetch(models.User, victim.id) is None) == allowed
    return "DELETE", f"/api/admin/users/{victim.id}", {}, check


@case("GET", "/api/admin/properties")
def _(w):
    new_prop(w.db, title="Borrador", status="draft", owner_id=w.owner_id)

    def check(w, r, allowed):
        if allowed:
            assert {p["title"] for p in r.json()} == {"Pública", "Borrador"}
    return "GET", "/api/admin/properties", {}, check


@case("POST", "/api/admin/properties")
def _(w):
    title = f"Admin prop {w.role}"

    def check(w, r, allowed):
        assert len(rows(models.Property, title=title)) == (1 if allowed else 0)
    return "POST", "/api/admin/properties", {"json": {"title": title, "price": 1000, "type": "piso"}}, check


@case("POST", "/api/admin/properties/import")
def _(w):
    title = f"Importada {w.role}"
    csv = f"title,price,type,location\n{title},90000,piso,Lorca\n".encode()

    def check(w, r, allowed):
        assert len(rows(models.Property, title=title)) == (1 if allowed else 0)
    return "POST", "/api/admin/properties/import", {"files": {"file": ("p.csv", csv, "text/csv")}}, check


@case("PUT", "/api/admin/properties/{property_id}")
def _(w):
    def check(w, r, allowed):
        assert fetch(models.Property, w.prop_id).price == (123 if allowed else 150000)
    return "PUT", f"/api/admin/properties/{w.prop_id}", {"json": {"price": 123}}, check


@case("DELETE", "/api/admin/properties/{property_id}")
def _(w):
    target = new_prop(w.db, owner_id=w.owner_id, title="A borrar")

    def check(w, r, allowed):
        assert (fetch(models.Property, target.id) is None) == allowed
    return "DELETE", f"/api/admin/properties/{target.id}", {}, check


@case("GET", "/api/user/properties")
def _(w):
    mine = new_prop(w.db, owner_id=w.me, title="Mía", status="draft")

    def check(w, r, allowed):
        if not allowed:
            return
        ids = {p["id"] for p in r.json()}
        # El admin ve todas las propiedades; el resto solo las suyas
        assert ids == ({mine.id, w.prop_id} if w.role == "admin" else {mine.id})
    return "GET", "/api/user/properties", {}, check


@case("POST", "/api/user/properties")
def _(w):
    title = f"Nueva de {w.role}"

    def check(w, r, allowed):
        created = rows(models.Property, title=title)
        assert len(created) == (1 if allowed else 0)
        if allowed:
            # El admin y las inmobiliarias aprobadas publican; el resto queda pendiente de revisión
            expected = "for-sale" if w.role in ("admin", "realtor") else "pending-review"
            assert created[0].owner_id == w.actor_id and created[0].status == expected
    return "POST", "/api/user/properties", {"json": {"title": title, "price": 1000, "type": "piso", "status": "for-sale"}}, check


@case("PUT", "/api/user/properties/{property_id}")
def _(w):
    mine = new_prop(w.db, owner_id=w.me, title="Mía", price=1000)

    def check(w, r, allowed):
        assert fetch(models.Property, mine.id).price == (2000 if allowed else 1000)
    return "PUT", f"/api/user/properties/{mine.id}", {"json": {"price": 2000}}, check


@case("DELETE", "/api/user/properties/{property_id}")
def _(w):
    mine = new_prop(w.db, owner_id=w.me, title="Mía")

    def check(w, r, allowed):
        assert (fetch(models.Property, mine.id) is None) == allowed
    return "DELETE", f"/api/user/properties/{mine.id}", {}, check


@case("GET", "/api/user/favorites")
def _(w):
    add(w.db, models.Favorite(user_id=w.me, property_id=w.prop_id))

    def check(w, r, allowed):
        if not allowed:
            return
        assert [p["id"] for p in r.json()] == [w.prop_id]
    return "GET", "/api/user/favorites", {}, check


@case("POST", "/api/user/favorites/{property_id}")
def _(w):
    def check(w, r, allowed):
        favs = rows(models.Favorite, property_id=w.prop_id)
        assert [f.user_id for f in favs] == ([w.actor_id] if allowed else [])
    return "POST", f"/api/user/favorites/{w.prop_id}", {}, check


@case("DELETE", "/api/user/favorites/{property_id}")
def _(w):
    add(w.db, models.Favorite(user_id=w.me, property_id=w.prop_id))

    def check(w, r, allowed):
        assert len(rows(models.Favorite, user_id=w.me)) == (0 if allowed else 1)
    return "DELETE", f"/api/user/favorites/{w.prop_id}", {}, check


@case("GET", "/api/user/searches")
def _(w):
    add(w.db, models.SavedSearch(user_id=w.me, name="Mía", filters='{"city": "Lorca"}'))

    def check(w, r, allowed):
        if not allowed:
            return
        assert [(s["name"], s["filters"]) for s in r.json()] == [("Mía", {"city": "Lorca"})]
    return "GET", "/api/user/searches", {}, check


@case("POST", "/api/user/searches")
def _(w):
    def check(w, r, allowed):
        saved = rows(models.SavedSearch)
        assert len(saved) == (1 if allowed else 0)
        if allowed:
            assert saved[0].user_id == w.actor_id and json.loads(saved[0].filters) == {"maxPrice": 1}
    return "POST", "/api/user/searches", {"json": {"name": "Barata", "filters": {"maxPrice": 1}}}, check


@case("DELETE", "/api/user/searches/{search_id}")
def _(w):
    s = add(w.db, models.SavedSearch(user_id=w.me, name="Mía", filters="{}"))

    def check(w, r, allowed):
        assert (fetch(models.SavedSearch, s.id) is None) == allowed
    return "DELETE", f"/api/user/searches/{s.id}", {}, check


@case("GET", "/api/user/messages")
def _(w):
    m = add(w.db, models.Message(user_id=w.me, receiver_id=w.owner_id, property_id=w.prop_id, content="Hola"))

    def check(w, r, allowed):
        if not allowed:
            return
        assert [x["id"] for x in r.json()] == [m.id]
    return "GET", "/api/user/messages", {}, check


@case("POST", "/api/user/messages")
def _(w):
    def check(w, r, allowed):
        sent = rows(models.Message, property_id=w.prop_id)
        assert len(sent) == (1 if allowed else 0)
        if allowed:
            assert (sent[0].user_id, sent[0].receiver_id, sent[0].property_title) == (w.actor_id, w.owner_id, "Pública")
    return "POST", "/api/user/messages", {"json": {"property_id": w.prop_id, "content": "¿Sigue disponible?"}}, check


@case("GET", "/api/user/messages/received")
def _(w):
    m = add(w.db, models.Message(user_id=w.owner_id, receiver_id=w.me, property_id=w.prop_id, content="Hola"))

    def check(w, r, allowed):
        if not allowed:
            return
        assert [x["id"] for x in r.json()] == [m.id]
    return "GET", "/api/user/messages/received", {}, check


@case("GET", "/api/user/conversations")
def _(w):
    add(w.db, models.Message(user_id=w.owner_id, receiver_id=w.me, property_id=w.prop_id, content="Hola"))

    def check(w, r, allowed):
        if not allowed:
            return
        [thread] = r.json()
        assert thread["other_user_id"] == w.owner_id and thread["unread_count"] == 1
    return "GET", "/api/user/conversations", {}, check


@case("POST", "/api/user/messages/{message_id}/reply")
def _(w):
    original = add(w.db, models.Message(user_id=w.owner_id, receiver_id=w.me, property_id=w.prop_id, content="Hola"))

    def check(w, r, allowed):
        assert fetch(models.Message, original.id).status == ("replied" if allowed else "pending")
        replies = [m for m in rows(models.Message, receiver_id=w.owner_id) if m.id != original.id]
        assert len(replies) == (1 if allowed else 0)
        if allowed:
            assert replies[0].user_id == w.actor_id and replies[0].content == "Sí"
    return "POST", f"/api/user/messages/{original.id}/reply", {"json": {"content": "Sí"}}, check


def game_token(user_id, seconds_ago=60):
    """Token de partida de La Torre como el de /api/games/balance/start, empezada hace seconds_ago."""
    started = datetime.now().timestamp() - seconds_ago
    return create_access_token({"sub": str(user_id), "type": "game", "game": "balance", "started": started})


@case("POST", "/api/games/score")
def _(w):
    def check(w, r, allowed):
        scores = rows(models.GameScore)
        assert [(s.user_id, s.score) for s in scores] == ([(w.actor_id, 42)] if allowed else [])
    token = game_token(w.actor_id or w.owner_id)
    return "POST", "/api/games/score", {"json": {"game_name": "balance", "score": 42, "session_token": token}}, check


@case("GET", "/api/games/{game_name}/leaderboard")
def _(w):
    add(w.db, models.GameScore(user_id=w.owner_id, game_name="balance", score=7))

    def check(w, r, allowed):
        assert [(e["user_name"], e["score"]) for e in r.json()] == [("Owner", 7)]
    return "GET", "/api/games/balance/leaderboard", {}, check


@case("POST", "/api/games/balance/start")
def _(w):
    def check(w, r, allowed):
        assert bool(r.json().get("session_token")) == allowed
    return "POST", "/api/games/balance/start", {}, check


@case("GET", "/api/games/tasador/daily")
def _(w):
    def check(w, r, allowed):
        assert len(r.json()["rondas"]) == 5 and all("real" not in x for x in r.json()["rondas"])
    return "GET", "/api/games/tasador/daily", {}, check


@case("POST", "/api/games/tasador/daily/guess")
def _(w):
    from services import games

    def check(w, r, allowed):
        assert "real" in r.json()
        # Solo se guarda la respuesta de quien juega con cuenta
        assert [(g.user_id, g.round_index) for g in rows(models.TasadorGuess)] == ([(w.actor_id, 0)] if w.actor_id else [])
    return "POST", "/api/games/tasador/daily/guess", {"json": {"day": games.today().isoformat(), "round": 0, "guess": 1500}}, check


def own_portfolio_property(w, **kw):
    """Vivienda de la cartera de quien hace la petición (para el invitado, del propietario)."""
    return add(w.db, models.PortfolioProperty(user_id=w.me, name="Mi piso", purchase_price=100000, **kw))


@case("GET", "/api/portfolio")
def _(w):
    own_portfolio_property(w)
    if w.actor_id:  # la del propietario no debe aparecer en la cartera del actor
        add(w.db, models.PortfolioProperty(user_id=w.owner_id, name="Ajeno", purchase_price=1))

    def check(w, r, allowed):
        if allowed:
            assert [v["name"] for v in r.json()["viviendas"]] == ["Mi piso"]
    return "GET", "/api/portfolio", {}, check


@case("POST", "/api/portfolio/properties")
def _(w):
    def check(w, r, allowed):
        assert [(p.user_id, p.name) for p in rows(models.PortfolioProperty)] == ([(w.actor_id, "Nuevo")] if allowed else [])
    return "POST", "/api/portfolio/properties", {"json": {"name": "Nuevo", "purchase_price": 1000}}, check


@case("PUT", "/api/portfolio/properties/{prop_id}")
def _(w):
    p = own_portfolio_property(w)

    def check(w, r, allowed):
        assert fetch(models.PortfolioProperty, p.id).name == ("Cambiado" if allowed else "Mi piso")
    return "PUT", f"/api/portfolio/properties/{p.id}", {"json": {"name": "Cambiado", "purchase_price": 1000}}, check


@case("DELETE", "/api/portfolio/properties/{prop_id}")
def _(w):
    p = own_portfolio_property(w)

    def check(w, r, allowed):
        assert (fetch(models.PortfolioProperty, p.id) is None) == allowed
    return "DELETE", f"/api/portfolio/properties/{p.id}", {}, check


@case("PUT", "/api/portfolio/items")
def _(w):
    def check(w, r, allowed):
        assert [(i.user_id, i.name) for i in rows(models.PortfolioItem)] == ([(w.actor_id, "Ahorros")] if allowed else [])
    return "PUT", "/api/portfolio/items", {"json": [{"kind": "asset", "name": "Ahorros", "amount": 10}]}, check


@case("GET", "/api/portfolio/municipios")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert r.json()[0]["municipio"] == "Murcia"
    return "GET", "/api/portfolio/municipios", {"params": {"q": "murcia"}}, check


@case("GET", "/api/games/tasador/leaderboard")
def _(w):
    from services import games
    add(w.db, models.TasadorGuess(user_id=w.owner_id, day=games.today().isoformat(), round_index=0, guess=1, points=80))

    def check(w, r, allowed):
        assert [(e["nombre"], e["puntos"]) for e in r.json()] == [("Owner", 80)]
    return "GET", "/api/games/tasador/leaderboard", {}, check


@case("GET", "/api/realtor/dashboard")
def _(w):
    new_prop(w.db, realtor_id=w.me, price=100000, title="Asignada", status="sold")

    def check(w, r, allowed):
        if allowed:
            assert r.json()["total_properties"] == 1 and r.json()["avg_sale_price"] == 100000
            assert r.json()["properties_sold"] == r.json()["this_month_sales"] == 1
    return "GET", "/api/realtor/dashboard", {}, check


@case("GET", "/api/realtor/properties")
def _(w):
    assigned = new_prop(w.db, realtor_id=w.me, title="Asignada")

    def check(w, r, allowed):
        if allowed:
            assert [p["id"] for p in r.json()] == [assigned.id]
    return "GET", "/api/realtor/properties", {}, check


@case("GET", "/api/investor/dashboard")
def _(w):
    return "GET", "/api/investor/dashboard", {}, None


def _investment(db, investor_id, property_id):
    return add(db, models.Investment(
        property_id=property_id, investor_id=investor_id, investment_amount=100000, current_value=120000,
        purchase_price=100000, purchase_date=datetime(2024, 1, 1), roi_percentage=20, annual_rental_income=6000,
        rental_yield=6, appreciation_rate=3, holding_period_months=24))


@case("GET", "/api/investor/portfolio")
def _(w):
    inv = _investment(w.db, w.me, w.prop_id)

    def check(w, r, allowed):
        if allowed:
            assert [i["id"] for i in r.json()] == [inv.id]
    return "GET", "/api/investor/portfolio", {}, check


@case("POST", "/api/ai/chat")
def _(w):
    def check(w, r, allowed):
        conv_id = r.json()["conversation_id"]
        if w.actor_id is None:
            assert conv_id is None and count(models.AIConversation) == 0
        else:
            assert fetch(models.AIConversation, conv_id).user_id == w.actor_id
    return "POST", "/api/ai/chat", {"json": {"message": "Busco un piso"}}, check


@case("GET", "/api/ai/config")
def _(w):
    return "GET", "/api/ai/config", {}, None


@case("POST", "/api/ai/listing-draft")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert r.json()["bedrooms"] == 3 and r.json()["price"] == 185000
    return "POST", "/api/ai/listing-draft", {"json": {"text": "Vendo piso 3 habitaciones 185.000 €"}}, check


@case("GET", "/api/ai/conversations")
def _(w):
    conv = add(w.db, models.AIConversation(user_id=w.me, title="Mía", messages=[{"role": "user", "content": "x"}]))

    def check(w, r, allowed):
        if not allowed:
            return
        assert [(c["id"], c["message_count"]) for c in r.json()] == [(conv.id, 1)]
    return "GET", "/api/ai/conversations", {}, check


@case("GET", "/api/ai/conversations/{conversation_id}")
def _(w):
    conv = add(w.db, models.AIConversation(user_id=w.me, title="Mía", messages=[{"role": "user", "content": "x"}]))

    def check(w, r, allowed):
        if not allowed:
            return
        assert r.json()["id"] == conv.id and r.json()["messages"] == [{"role": "user", "content": "x"}]
    return "GET", f"/api/ai/conversations/{conv.id}", {}, check


@case("GET", "/api/ping")
def _(w):
    return "GET", "/api/ping", {}, None


@case("GET", "/api/social/instagram/{property_id}")
def _(w):
    def check(w, r, allowed):
        if allowed:
            assert r.json()["configured"] is False and r.json()["post"] is None and "#" in r.json()["caption"]
    return "GET", f"/api/social/instagram/{w.prop_id}", {}, check


@case("POST", "/api/social/instagram/{property_id}")
def _(w):
    def check(w, r, allowed):
        assert rows(models.SocialPost) == []  # nada se publica sin la cuenta conectada
    return "POST", f"/api/social/instagram/{w.prop_id}", {"json": {"caption": "Texto del Reel"}}, check


@case("GET", "/health")
def _(w):
    def check(w, r, allowed):
        assert r.json()["total_properties"] == count(models.Property) and "total_users" not in r.json()
    return "GET", "/health", {}, check


def client_get_me(token):
    return TestClient(app).get("/api/auth/me", headers=bearer(token)).json()["id"]


def test_matrix_covers_every_openapi_route():
    routes = {(m.upper(), p) for p, ops in app.openapi()["paths"].items() for m in ops}
    assert len(routes) == 66
    assert set(MATRIX) == routes
    assert set(CASES) == routes


@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("route", list(MATRIX), ids=[f"{m} {p}" for m, p in MATRIX])
def test_permission_matrix(route, role, client, db):
    expected = MATRIX[route][ROLES.index(role)]
    w = World(db, role)
    method, url, kwargs, check = CASES[route](w)
    r = client.request(method, url, headers=w.h, **kwargs)
    assert r.status_code == expected, r.text
    if check is not None:
        check(w, r, ok(r))


# --- 422: la validación llega después de la autenticación -----------------

VALIDATION = [
    # petición inválida                                                        guest user realtor investor admin
    ("POST", "/api/auth/login", {"json": {}},                                   (422, 422, 422, 422, 422)),
    ("POST", "/api/auth/register", {"json": {"email": "no-es-email", "password": "x"}}, (422, 422, 422, 422, 422)),
    ("GET", "/api/auth/verify-email", {},                                       (422, 422, 422, 422, 422)),
    ("POST", "/api/auth/change-password", {"json": {"current_password": PASSWORD, "new_password": "corta"}}, (401, 422, 422, 422, 422)),
    ("POST", "/api/auth/forgot-password", {"json": {"email": "no-es-email"}},     (422, 422, 422, 422, 422)),
    ("POST", "/api/auth/google", {"json": {"credential": "x" * 40, "role": "admin"}}, (422, 422, 422, 422, 422)),
    ("POST", "/api/auth/reset-password", {"json": {"token": "x"}},              (422, 422, 422, 422, 422)),
    ("POST", "/api/auth/change-email", {"json": {"new_email": "x", "password": PASSWORD}}, (401, 422, 422, 422, 422)),
    ("GET", "/api/auth/confirm-email-change", {},                               (422, 422, 422, 422, 422)),
    ("POST", "/api/contact", {"json": {"name": "A", "email": "a@example.com", "message": "corto"}}, (422, 422, 422, 422, 422)),
    ("GET", "/api/properties?limit=101", {},                                    (422, 422, 422, 422, 422)),
    ("POST", "/api/upload-images", {},                                          (401, 422, 422, 422, 422)),
    ("GET", "/api/properties/abc", {},                                          (422, 422, 422, 422, 422)),
    ("GET", "/api/properties?limit=abc", {},                                    (422, 422, 422, 422, 422)),
    ("PUT", "/api/admin/users/abc", {"json": {}},                               (401, 403, 403, 403, 422)),
    ("PUT", "/api/admin/users/1", {"json": [1]},                                (401, 403, 403, 403, 422)),
    ("POST", "/api/admin/properties/import", {},                                (401, 403, 403, 403, 422)),
    ("DELETE", "/api/admin/properties/abc", {},                                 (401, 403, 403, 403, 422)),
    ("PUT", "/api/user/properties/abc", {"json": {}},                           (401, 422, 422, 422, 422)),
    ("POST", "/api/user/properties", {"json": "texto"},                         (401, 422, 422, 422, 422)),
    ("POST", "/api/user/favorites/abc", {},                                     (401, 422, 422, 422, 422)),
    ("DELETE", "/api/user/searches/abc", {},                                    (401, 422, 422, 422, 422)),
    ("POST", "/api/user/messages/abc/reply", {"json": {"content": "x"}},        (401, 422, 422, 422, 422)),
    ("POST", "/api/games/score", {"json": {"game_name": "g"}},                  (401, 422, 422, 422, 422)),
    ("POST", "/api/games/score", {"json": {"game_name": "balance", "score": 5}}, (401, 422, 422, 422, 422)),
    ("POST", "/api/games/tasador/daily/guess", {"json": {"day": "hoy", "round": 0, "guess": 1}}, (422, 422, 422, 422, 422)),
    ("POST", "/api/games/tasador/daily/guess", {"json": {"day": "2026-01-01", "round": 9, "guess": 1}}, (422, 422, 422, 422, 422)),
    ("POST", "/api/games/score", {"json": {"game_name": "g", "score": "mucho"}}, (401, 422, 422, 422, 422)),
    ("GET", "/api/games/g/leaderboard?limit=abc", {},                           (422, 422, 422, 422, 422)),
    ("POST", "/api/ai/chat", {"json": {}},                                      (422, 422, 422, 422, 422)),
    ("POST", "/api/ai/chat", {"json": {"message": "hola", "conversation_id": "x"}}, (422, 422, 422, 422, 422)),
    ("GET", "/api/ai/conversations/abc", {},                                    (401, 422, 422, 422, 422)),
]


@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("req", VALIDATION, ids=[f"{m} {p} {k}" for m, p, k, _ in VALIDATION])
def test_validation_matrix(req, role, client, db):
    method, url, kwargs, expected = req
    h = {} if role == "guest" else auth(new_user(db, f"{role}@example.com", role=role))
    r = client.request(method, url, headers=h, **kwargs)
    assert r.status_code == expected[ROLES.index(role)], r.text


@pytest.mark.parametrize("url", ["/api/auth/me", "/api/admin/users", "/api/realtor/dashboard", "/api/user/favorites"])
@pytest.mark.parametrize("token", ["basura", "verify", "reset", "expired", "deleted_user", "wrong_secret"])
def test_bad_tokens_are_401(url, token, client, db):
    import jwt
    u = new_user(db, "admin@example.com", role="admin")
    tokens = {
        "basura": "abc.def.ghi",
        "verify": create_access_token({"sub": str(u.id), "type": "verify"}),
        "reset": create_access_token({"sub": str(u.id), "type": "reset", "pv": password_fingerprint(u.hashed_password)}),
        "expired": jwt.encode({"sub": str(u.id), "exp": datetime.utcnow() - timedelta(minutes=1)}, "test-secret", algorithm="HS256"),
        "deleted_user": create_access_token({"sub": "9999", "type": "access"}),
        "wrong_secret": jwt.encode({"sub": str(u.id), "exp": datetime.utcnow() + timedelta(minutes=5)}, "otra", algorithm="HS256"),
    }
    assert client.get(url, headers=bearer(tokens[token])).status_code == 401


# ==========================================================================
# 2. PROPIEDAD DE RECURSOS (IDOR): cada actor contra recursos de otro actor
# ==========================================================================

PAIRS = [(a, v) for a in LOGGED_ROLES for v in LOGGED_ROLES if a != v]
PAIR_IDS = [f"{a}->{v}" for a, v in PAIRS]


def two_actors(db, attacker_role, victim_role):
    attacker = new_user(db, f"attacker-{attacker_role}@example.com", role=attacker_role, full_name="Atacante")
    victim = new_user(db, f"victim-{victim_role}@example.com", role=victim_role, full_name="Víctima")
    return attacker, victim


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_user_property_edit_and_delete(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    pid = client.post("/api/user/properties", json={"title": "De la víctima", "price": 1000, "type": "piso"}, headers=auth(victim)).json()["id"]
    is_admin = attacker_role == "admin"

    r = client.put(f"/api/user/properties/{pid}", json={"price": 1, "title": "Hackeada"}, headers=auth(attacker))
    assert r.status_code == (200 if is_admin else 403)
    p = fetch(models.Property, pid)
    assert (p.title, p.price) == (("Hackeada", 1) if is_admin else ("De la víctima", 1000))
    assert p.owner_id == victim.id  # ni el admin cambia el propietario al editar

    r = client.delete(f"/api/user/properties/{pid}", headers=auth(attacker))
    assert r.status_code == (200 if is_admin else 403)
    assert (fetch(models.Property, pid) is None) == is_admin
    # La víctima no ve su listado alterado por el atacante (salvo el borrado del admin)
    mine = client.get("/api/user/properties", headers=auth(victim)).json()
    assert [x["id"] for x in mine] == ([] if is_admin else [pid])


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_admin_endpoints_on_other_actor(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    prop = new_prop(db, owner_id=victim.id, price=1000)
    h = auth(attacker)
    expected = 200 if attacker_role == "admin" else 403

    assert client.put(f"/api/admin/users/{victim.id}", json={"full_name": "Cambiado"}, headers=h).status_code == expected
    assert client.put(f"/api/admin/properties/{prop.id}", json={"price": 1}, headers=h).status_code == expected
    assert fetch(models.User, victim.id).full_name == ("Cambiado" if expected == 200 else "Víctima")
    assert fetch(models.Property, prop.id).price == (1 if expected == 200 else 1000)

    assert client.delete(f"/api/admin/properties/{prop.id}", headers=h).status_code == expected
    assert (fetch(models.Property, prop.id) is None) == (expected == 200)
    assert client.delete(f"/api/admin/users/{victim.id}", headers=h).status_code == expected
    assert (fetch(models.User, victim.id) is None) == (expected == 200)


@pytest.mark.parametrize("role", ["user", "realtor", "investor"])
def test_non_admin_cannot_escalate_own_role(role, client, db):
    me = new_user(db, "me@example.com", role=role)
    assert client.put(f"/api/admin/users/{me.id}", json={"role": "admin"}, headers=auth(me)).status_code == 403
    assert client.post("/api/admin/users", json={"email": "alt@example.com", "role": "admin"}, headers=auth(me)).status_code == 403
    assert fetch(models.User, me.id).role == role
    assert rows(models.User, email="alt@example.com") == []


@pytest.mark.parametrize("role", LOGGED_ROLES)
def test_owner_and_realtor_cannot_be_injected_via_payload(role, client, db):
    me = new_user(db, "me@example.com", role=role)
    other = new_user(db, "other@example.com")
    r = client.post("/api/user/properties", json={"title": "X", "price": 1, "type": "piso", "owner_id": other.id, "realtor_id": other.id, "id": 999}, headers=auth(me))
    assert r.status_code == 200
    p = fetch(models.Property, r.json()["id"])
    assert (p.owner_id, p.realtor_id) == (me.id, None) and p.id != 999
    client.put(f"/api/user/properties/{p.id}", json={"owner_id": other.id, "realtor_id": other.id}, headers=auth(me))
    p = fetch(models.Property, p.id)
    assert (p.owner_id, p.realtor_id) == (me.id, None)


@pytest.mark.parametrize("attacker_role", ["user", "investor", "admin"])
def test_assigned_realtor_cannot_edit_but_others_cannot_either(attacker_role, client, db):
    """realtor_id no da permisos de edición: solo owner_id o admin (routers/user.py)."""
    owner = new_user(db, "owner@example.com")
    realtor = new_user(db, "realtor@example.com", role="realtor")
    prop = new_prop(db, owner_id=owner.id, realtor_id=realtor.id)
    assert client.put(f"/api/user/properties/{prop.id}", json={"price": 1}, headers=auth(realtor)).status_code == 403
    assert client.delete(f"/api/user/properties/{prop.id}", headers=auth(realtor)).status_code == 403
    assert fetch(models.Property, prop.id).price == 150000


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_favorites(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    prop = new_prop(db)
    assert client.post(f"/api/user/favorites/{prop.id}", headers=auth(victim)).status_code == 200
    assert client.get("/api/user/favorites", headers=auth(attacker)).json() == []
    # El atacante "borra" el favorito: solo afecta a los suyos (no tiene ninguno)
    assert client.delete(f"/api/user/favorites/{prop.id}", headers=auth(attacker)).status_code == 200
    assert [f.user_id for f in rows(models.Favorite)] == [victim.id]
    # Favorito del atacante sobre la misma propiedad: filas independientes
    client.post(f"/api/user/favorites/{prop.id}", headers=auth(attacker))
    client.delete(f"/api/user/favorites/{prop.id}", headers=auth(victim))
    assert [f.user_id for f in rows(models.Favorite)] == [attacker.id]


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_saved_searches(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    sid = client.post("/api/user/searches", json={"name": "Secreta", "filters": {"city": "Lorca"}}, headers=auth(victim)).json()["id"]
    assert client.get("/api/user/searches", headers=auth(attacker)).json() == []
    # Responde 200 aunque no borre nada (no revela si el id existe), también para el admin
    assert client.delete(f"/api/user/searches/{sid}", headers=auth(attacker)).status_code == 200
    assert fetch(models.SavedSearch, sid) is not None
    assert len(client.get("/api/user/searches", headers=auth(victim)).json()) == 1


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_messages(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    third = new_user(db, "third@example.com", full_name="Tercero")
    prop = new_prop(db, owner_id=third.id)
    ha = auth(attacker)
    # La víctima escribe al tercero y el tercero le responde
    mid = client.post("/api/user/messages", json={"property_id": prop.id, "content": "Privado"}, headers=auth(victim)).json()["id"]
    reply_id = client.post(f"/api/user/messages/{mid}/reply", json={"content": "Respuesta privada"}, headers=auth(third)).json()["id"]

    assert client.get("/api/user/messages", headers=ha).json() == []
    assert client.get("/api/user/messages/received", headers=ha).json() == []
    assert client.get("/api/user/conversations", headers=ha).json() == []
    # Nadie salvo el destinatario puede responder, ni siquiera el admin
    for target in (mid, reply_id):
        assert client.post(f"/api/user/messages/{target}/reply", json={"content": "Intruso"}, headers=ha).status_code == 404
    assert fetch(models.Message, reply_id).status == "pending"
    assert count(models.Message) == 2

    # Escribir directamente a la víctima sin hilo previo: solo el admin
    r = client.post("/api/user/messages", json={"receiver_id": victim.id, "content": "Hola"}, headers=ha)
    assert r.status_code == (200 if attacker_role == "admin" else 403)
    assert count(models.Message) == (3 if attacker_role == "admin" else 2)


@pytest.mark.parametrize("attacker_role,victim_role", PAIRS, ids=PAIR_IDS)
def test_idor_ai_conversations(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    conv_id = client.post("/api/ai/chat", json={"message": "Busco villa privada"}, headers=auth(victim)).json()["conversation_id"]
    before = fetch(models.AIConversation, conv_id).messages

    assert client.get(f"/api/ai/conversations/{conv_id}", headers=auth(attacker)).status_code == 404
    assert client.get("/api/ai/conversations", headers=auth(attacker)).json() == []
    # Intentar continuar la conversación ajena crea una nueva del atacante
    r = client.post("/api/ai/chat", json={"message": "hola", "conversation_id": conv_id}, headers=auth(attacker))
    assert r.status_code == 200 and r.json()["conversation_id"] != conv_id
    assert fetch(models.AIConversation, conv_id).messages == before
    assert fetch(models.AIConversation, r.json()["conversation_id"]).user_id == attacker.id


@pytest.mark.parametrize("attacker_role,victim_role", [p for p in PAIRS if "investor" in p], ids=[i for p, i in zip(PAIRS, PAIR_IDS) if "investor" in p])
def test_idor_investor_portfolio(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    prop = new_prop(db)
    _investment(db, victim.id, prop.id)
    r = client.get("/api/investor/portfolio", headers=auth(attacker))
    assert r.status_code == (200 if attacker_role == "investor" else 403)
    if attacker_role == "investor":
        assert r.json() == []


@pytest.mark.parametrize("attacker_role,victim_role", [p for p in PAIRS if "realtor" in p], ids=[i for p, i in zip(PAIRS, PAIR_IDS) if "realtor" in p])
def test_idor_realtor_properties(attacker_role, victim_role, client, db):
    attacker, victim = two_actors(db, attacker_role, victim_role)
    new_prop(db, realtor_id=victim.id)
    r = client.get("/api/realtor/properties", headers=auth(attacker))
    assert r.status_code == (200 if attacker_role == "realtor" else 403)
    if attacker_role == "realtor":
        assert r.json() == []
        assert client.get("/api/realtor/dashboard", headers=auth(attacker)).json()["total_properties"] == 0


def test_admin_404_on_missing_resources(client, db):
    h = auth(new_user(db, "admin@example.com", role="admin"))
    for method, url in [("PUT", "/api/admin/users/999"), ("DELETE", "/api/admin/users/999"),
                        ("PUT", "/api/admin/properties/999"), ("DELETE", "/api/admin/properties/999"),
                        ("PUT", "/api/user/properties/999"), ("DELETE", "/api/user/properties/999"),
                        ("POST", "/api/user/messages/999/reply"), ("GET", "/api/ai/conversations/999")]:
        kwargs = {"json": {"content": "x"}} if method != "DELETE" and "messages" in url else ({"json": {}} if method == "PUT" else {})
        assert client.request(method, url, headers=h, **kwargs).status_code == 404, (method, url)


# ==========================================================================
# 3. FLUJOS COMPLETOS
# ==========================================================================

ALL_STATUSES = ["for-sale", "for-rent", "reserved", "draft", "available", "pending", "sold", "rented"]


def test_user_lifecycle(client, db):
    seller = new_user(db, "seller@example.com", full_name="Vendedor")
    other_prop = new_prop(db, owner_id=seller.id, title="Chalet del vendedor")

    # Registro -> sin verificar no puede entrar
    no_terms = {"email": "ana@example.com", "password": "pw123456", "full_name": "Ana"}
    assert client.post("/api/auth/register", json=no_terms).status_code == 400
    r = client.post("/api/auth/register", json={**no_terms, "accept_terms": True})
    assert r.status_code == 200
    uid = r.json()["user_id"]
    u = fetch(models.User, uid)
    assert (u.role, u.is_verified, u.is_active, u.is_approved) == ("user", False, True, True) and u.hashed_password.startswith("$2")
    assert u.terms_accepted_at is not None
    assert login(client, "ana@example.com", "pw123456").status_code == 403

    # Verificación de email
    token = create_access_token({"sub": str(uid), "type": "verify"})
    assert client.get("/api/auth/verify-email", params={"token": token}).status_code == 200
    assert fetch(models.User, uid).is_verified is True

    # Login con token de sesión real
    r = login(client, "ana@example.com", "pw123456")
    assert r.status_code == 200
    h = bearer(r.json()["access_token"])
    assert client.get("/api/auth/me", headers=h).json()["id"] == uid

    # Crear propiedades: sin estado -> borrador; lo que se publicaría espera la revisión del admin
    default = client.post("/api/user/properties", json={"title": "Por defecto", "price": 100000, "type": "piso", "location": "Murcia"}, headers=h).json()
    assert default["status"] == "draft" and default["owner_id"] == uid and default["city"] == "Murcia"
    ids = {}
    for status in ALL_STATUSES:
        r = client.post("/api/user/properties", json={"title": f"Estado {status}", "price": 100000, "type": "piso", "status": status}, headers=h)
        public_request = status in PUBLIC_STATUSES
        assert r.status_code == 200
        assert (r.json()["status"], r.json()["pending_status"]) == (("pending-review", status) if public_request else (status, None))
        ids[status] = r.json()["id"]

    # Nada suyo sale en el portal hasta que el admin lo aprueba con el estado que pidió
    assert {p["id"] for p in client.get("/api/properties").json()} == {other_prop.id}
    admin = auth(new_user(db, "revisor@example.com", role="admin"))
    for status in PUBLIC_STATUSES:
        assert client.put(f"/api/admin/properties/{ids[status]}", json={"status": status}, headers=admin).status_code == 200
    public = {p["id"] for p in client.get("/api/properties").json()}
    assert public == {ids[s] for s in PUBLIC_STATUSES} | {other_prop.id}
    assert fetch(models.Property, ids["for-rent"]).pending_status is None
    # Su panel muestra todas, incluido el borrador
    assert {p["id"] for p in client.get("/api/user/properties", headers=h).json()} == set(ids.values()) | {default["id"]}

    # Editar
    pid = ids["for-sale"]
    before = fetch(models.Property, pid).updated_at
    r = client.put(f"/api/user/properties/{pid}", json={"title": "Piso reformado", "price": 120000, "bedrooms": 3, "coordinates": {"lat": 37.98, "lng": -1.13}, "energyRating": "B"}, headers=h)
    assert r.status_code == 200
    p = fetch(models.Property, pid)
    assert (p.title, p.price, p.bedrooms, p.latitude, p.longitude, p.energy_rating) == ("Piso reformado", 120000, 3, 37.98, -1.13, "B")
    assert p.updated_at > before
    # Cambiar el contenido de un anuncio aprobado lo devuelve a revisión
    assert (p.status, p.pending_status) == ("pending-review", "for-sale")
    assert pid not in {x["id"] for x in client.get("/api/properties").json()}

    # Subir imágenes y adjuntarlas
    r = client.post("/api/upload-images", files=[("files", ("a.png", PNG, "image/png")), ("files", ("b.JPG", JPG, "image/jpeg"))], headers=h)
    assert r.status_code == 200
    urls = r.json()["urls"]
    assert len(urls) == 2 and urls[0].endswith(".png") and urls[1].endswith(".jpg")
    for url, content in zip(urls, (PNG, JPG)):
        served = client.get("/uploads/" + url.rsplit("/", 1)[1])
        assert served.status_code == 200 and served.content == content
    assert client.put(f"/api/user/properties/{pid}", json={"images": urls}, headers=h).status_code == 200
    assert fetch(models.Property, pid).images == urls
    assert client.put(f"/api/admin/properties/{pid}", json={"status": "for-sale"}, headers=admin).status_code == 200
    assert next(x for x in client.get("/api/properties").json() if x["id"] == pid)["images"] == urls

    # Favorito de otro anuncio
    assert client.post(f"/api/user/favorites/{other_prop.id}", headers=h).json()["message"] == "Added to favorites"
    assert [(f.user_id, f.property_id) for f in rows(models.Favorite)] == [(uid, other_prop.id)]
    assert [x["id"] for x in client.get("/api/user/favorites", headers=h).json()] == [other_prop.id]

    # Búsqueda guardada
    sid = client.post("/api/user/searches", json={"name": "Chalets", "filters": {"type": "chalet", "maxPrice": 300000}}, headers=h).json()["id"]
    s = fetch(models.SavedSearch, sid)
    assert (s.user_id, s.name, json.loads(s.filters)) == (uid, "Chalets", {"type": "chalet", "maxPrice": 300000})

    # Mensaje al propietario del otro anuncio
    mid = client.post("/api/user/messages", json={"property_id": other_prop.id, "content": "¿Puedo visitarlo?"}, headers=h).json()["id"]
    m = fetch(models.Message, mid)
    assert (m.user_id, m.receiver_id, m.property_id, m.property_title, m.sender_name, m.status) == \
        (uid, seller.id, other_prop.id, "Chalet del vendedor", "Ana", "pending")

    # El propietario responde
    r = client.post(f"/api/user/messages/{mid}/reply", json={"content": "Claro, el lunes"}, headers=auth(seller))
    assert r.status_code == 200
    reply = fetch(models.Message, r.json()["id"])
    assert (reply.user_id, reply.receiver_id, reply.property_id) == (seller.id, uid, other_prop.id)
    assert fetch(models.Message, mid).status == "replied"
    [thread] = client.get("/api/user/conversations", headers=h).json()
    assert thread["other_user_id"] == seller.id and thread["other_user_name"] == "Vendedor"
    assert [x["is_mine"] for x in thread["messages"]] == [True, False] and thread["unread_count"] == 1
    # La compradora puede seguir el hilo respondiendo a la respuesta
    assert client.post(f"/api/user/messages/{reply.id}/reply", json={"content": "Perfecto"}, headers=h).status_code == 200

    # Borrar sus propiedades (sin favoritos ni mensajes)
    for status in ("draft", "for-sale"):
        assert client.delete(f"/api/user/properties/{ids[status]}", headers=h).status_code == 200
        assert fetch(models.Property, ids[status]) is None
    assert ids["for-sale"] not in {x["id"] for x in client.get("/api/properties").json()}
    # Una por estado más la creada sin estado, menos las dos borradas
    assert len(rows(models.Property, owner_id=uid)) == len(ALL_STATUSES) + 1 - 2


def test_admin_lifecycle(client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    h = bearer(login(client, "admin@example.com").json()["access_token"])

    # Crear un usuario de cada rol
    created = {}
    for role in ["user", "realtor", "investor", "admin"]:
        r = client.post("/api/admin/users", json={"email": f"{role}-new@example.com", "password": "pw123456", "role": role, "full_name": role.title(), "company": "ACME", "phone": "600"}, headers=h)
        assert r.status_code == 200 and "hashed_password" not in r.json()
        u = fetch(models.User, r.json()["id"])
        assert (u.role, u.is_verified, u.is_active, u.company, u.phone) == (role, True, True, "ACME", "600")
        created[role] = u.id
        tok = login(client, f"{role}-new@example.com", "pw123456")
        assert tok.status_code == 200 and tok.json()["user"]["role"] == role
    assert client.post("/api/admin/users", json={"email": "user-new@example.com", "password": "pw123456"}, headers=h).status_code == 400

    # Cambiar rol: el token existente adopta el nuevo rol (el rol se lee de la BD)
    uh = bearer(login(client, "user-new@example.com", "pw123456").json()["access_token"])
    assert client.get("/api/realtor/dashboard", headers=uh).status_code == 403
    assert client.put(f"/api/admin/users/{created['user']}", json={"role": "realtor"}, headers=h).json()["role"] == "realtor"
    assert fetch(models.User, created["user"]).role == "realtor"
    assert client.get("/api/realtor/dashboard", headers=uh).status_code == 200

    # Cambiar email a uno ocupado -> 400; a uno libre -> OK
    assert client.put(f"/api/admin/users/{created['user']}", json={"email": "admin@example.com"}, headers=h).status_code == 400
    assert client.put(f"/api/admin/users/{created['user']}", json={"email": "renamed@example.com"}, headers=h).status_code == 200
    assert fetch(models.User, created["user"]).email == "renamed@example.com"

    # Cambiar contraseña: la anterior y sus sesiones dejan de valer
    assert client.put(f"/api/admin/users/{created['user']}", json={"password": "otra-clave"}, headers=h).status_code == 200
    assert login(client, "renamed@example.com", "pw123456").status_code == 401
    assert client.get("/api/auth/me", headers=uh).status_code == 401
    uh = bearer(login(client, "renamed@example.com", "otra-clave").json()["access_token"])

    # Desactivar y reactivar
    assert client.put(f"/api/admin/users/{created['user']}", json={"is_active": False}, headers=h).status_code == 200
    assert fetch(models.User, created["user"]).is_active is False
    assert login(client, "renamed@example.com", "otra-clave").status_code == 403
    assert client.get("/api/auth/me", headers=uh).status_code == 401
    assert client.put(f"/api/admin/users/{created['user']}", json={"is_active": True}, headers=h).status_code == 200
    assert client.get("/api/auth/me", headers=uh).status_code == 200

    # Borrar usuario
    assert client.delete(f"/api/admin/users/{created['investor']}", headers=h).status_code == 200
    assert fetch(models.User, created["investor"]) is None
    assert login(client, "investor-new@example.com", "pw123456").status_code == 401
    assert client.delete(f"/api/admin/users/{admin.id}", headers=h).status_code == 400  # a sí mismo no

    # Propiedades: crear (estado por defecto 'for-sale', publicada), editar, borrar
    r = client.post("/api/admin/properties", json={"title": "Ático", "price": 300000, "type": "atico", "location": "Murcia", "bedrooms": 2, "features": ["terraza"]}, headers=h)
    assert r.status_code == 200
    pid = r.json()["id"]
    p = fetch(models.Property, pid)
    assert (p.title, p.status, p.owner_id, p.city, p.features) == ("Ático", "for-sale", admin.id, "Murcia", ["terraza"])
    r = client.put(f"/api/admin/properties/{pid}", json={"price": 280000, "status": "for-sale"}, headers=h)
    assert r.status_code == 200
    p = fetch(models.Property, pid)
    assert (p.price, p.status, p.title) == (280000, "for-sale", "Ático")
    assert pid in {x["id"] for x in client.get("/api/properties").json()}
    # El admin también puede editar y borrar anuncios ajenos por el endpoint de usuario
    foreign = new_prop(db, owner_id=created["realtor"])
    assert client.put(f"/api/user/properties/{foreign.id}", json={"price": 1}, headers=h).status_code == 200
    assert client.delete(f"/api/user/properties/{foreign.id}", headers=h).status_code == 200
    assert client.delete(f"/api/admin/properties/{pid}", headers=h).status_code == 200
    assert fetch(models.Property, pid) is None

    # Importación CSV
    csv = b"Title, Price ,type,bedrooms,bathrooms,area,location\nCasa A,100000,casa,3,2,120,Lorca\nCasa B,200000,villa,,,,Murcia\nMala,no-es-numero,casa,1,1,50,Lorca\n"
    r = client.post("/api/admin/properties/import", files={"file": ("lote.csv", csv, "text/csv")}, headers=h)
    assert r.status_code == 200
    assert (r.json()["properties_added"], r.json()["errors"]) == (2, 1)
    imported = {p.title: p for p in rows(models.Property, owner_id=admin.id)}
    assert set(imported) == {"Casa A", "Casa B"}
    a, b = imported["Casa A"], imported["Casa B"]
    assert (a.price, a.type, a.bedrooms, a.bathrooms, a.area, a.city, a.status) == (100000, "house", 3, 2, 120, "Lorca", "for-sale")
    assert (b.bedrooms, b.bathrooms, b.area) == (None, None, None)  # lo que falta queda vacío, no se inventa
    # Columnas en español, separador ';' (Excel), estado no válido y fotos por URL
    csv_es = ("titulo;precio;tipo;habitaciones;baños;superficie;municipio;estado;fotos\n"
              "Piso C;150.000;Ático;2;1;70;Murcia;En alquiler;https://x.test/1.jpg|https://x.test/2.jpg\n"
              "Piso D;90000;piso;1;1;40;Lorca;borrador;\n").encode()
    r = client.post("/api/admin/properties/import", files={"file": ("lote.csv", csv_es, "text/csv")}, headers=h)
    assert (r.json()["properties_added"], r.json()["errors"]) == (1, 1) and "estado no válido" in r.json()["error_details"][0]
    [c] = rows(models.Property, title="Piso C")
    assert (c.price, c.type, c.bedrooms, c.area, c.city, c.status) == (150000.0, "penthouse", 2, 70.0, "Murcia", "for-rent")
    assert c.images == ["https://x.test/1.jpg", "https://x.test/2.jpg"]
    too_big = b"title,price\n" + b"x" * (10 * 1024 * 1024)
    assert client.post("/api/admin/properties/import", files={"file": ("big.csv", too_big, "text/csv")}, headers=h).status_code == 413
    # JSON también
    r = client.post("/api/admin/properties/import", files={"file": ("lote.json", b'[{"title": "Desde JSON", "price": 5}]', "application/json")}, headers=h)
    assert r.json()["properties_added"] == 1 and rows(models.Property, title="Desde JSON")
    assert client.post("/api/admin/properties/import", files={"file": ("lote.xlsx", b"x", "application/octet-stream")}, headers=h).status_code == 400
    assert client.post("/api/admin/properties/import", files={"file": ("roto.csv", b"\xff\xfe\x00", "text/csv")}, headers=h).status_code == 400

    # Panel: los totales coinciden con la BD
    dash = client.get("/api/admin/dashboard", headers=h).json()
    assert dash["total_users"] == count(models.User) == 4
    assert dash["total_properties"] == count(models.Property) == 4
    assert len(client.get("/api/admin/users", headers=h).json()) == 4
    assert len(client.get("/api/admin/properties", headers=h).json()) == 4
    assert len(client.get("/api/user/properties", headers=h).json()) == 4  # el admin ve todas


def test_realtor_lifecycle(client, db):
    realtor = new_user(db, "realtor@example.com", role="realtor")
    other_realtor = new_user(db, "otro@example.com", role="realtor")
    h = bearer(login(client, "realtor@example.com").json()["access_token"])
    assert client.get("/api/realtor/properties", headers=h).json() == []
    assert client.get("/api/realtor/dashboard", headers=h).json()["total_properties"] == 0

    # Asignación por realtor_id (no hay endpoint que lo haga: se escribe en la BD)
    a = new_prop(db, realtor_id=realtor.id, price=100000, status="for-sale")
    b = new_prop(db, realtor_id=realtor.id, price=200000, status="draft")
    new_prop(db, realtor_id=other_realtor.id, price=999999)
    new_prop(db, price=1)
    assert {p["id"] for p in client.get("/api/realtor/properties", headers=h).json()} == {a.id, b.id}
    dash = client.get("/api/realtor/dashboard", headers=h).json()
    assert dash["total_properties"] == 2 and dash["properties_sold"] == 0 and dash["avg_sale_price"] == 0

    # Un comprador escribe sobre el anuncio: puede dirigirse al agente asignado
    buyer = new_user(db, "buyer@example.com")
    r = client.post("/api/user/messages", json={"property_id": a.id, "receiver_id": realtor.id, "content": "Info"}, headers=auth(buyer))
    assert r.status_code == 200
    m = fetch(models.Message, r.json()["id"])
    assert (m.receiver_id, m.realtor_id) == (realtor.id, realtor.id)
    assert [x["id"] for x in client.get("/api/user/messages/received", headers=h).json()] == [m.id]
    assert client.post(f"/api/user/messages/{m.id}/reply", json={"content": "Le llamo"}, headers=h).status_code == 200

    # El realtor publica sus propios anuncios como cualquier usuario (owner_id, no realtor_id)
    own = client.post("/api/user/properties", json={"title": "Del agente", "price": 1, "type": "piso"}, headers=h).json()
    assert own["owner_id"] == realtor.id and own["realtor_id"] is None
    assert own["id"] not in {p["id"] for p in client.get("/api/realtor/properties", headers=h).json()}


def test_investor_lifecycle(client, db):
    investor = new_user(db, "inv@example.com", role="investor")
    other = new_user(db, "inv2@example.com", role="investor")
    h = bearer(login(client, "inv@example.com").json()["access_token"])
    assert client.get("/api/investor/portfolio", headers=h).json() == []
    dash = client.get("/api/investor/dashboard", headers=h).json()
    assert set(dash) == {"portfolio_value", "total_properties", "monthly_income", "average_roi", "total_investment", "unrealized_gains", "rental_yield", "appreciation_rate"}

    p1, p2 = new_prop(db), new_prop(db, title="Otra")
    i1 = _investment(db, investor.id, p1.id)
    i2 = _investment(db, investor.id, p2.id)
    _investment(db, other.id, p1.id)
    portfolio = client.get("/api/investor/portfolio", headers=h).json()
    assert {i["id"] for i in portfolio} == {i1.id, i2.id}
    assert all(i["investor_id"] == investor.id for i in portfolio)


def test_games_lifecycle(client, db):
    ana = new_user(db, "ana@example.com", full_name="Ana Pérez")
    beto = new_user(db, "beto@example.com")
    caro = new_user(db, "caro@example.com", full_name="Caro", role="realtor")
    dani = new_user(db, "dani@example.com", full_name="Dani", role="admin")

    def submit(u, score, game="balance"):
        token = game_token(u.id, seconds_ago=600)
        return client.post("/api/games/score", json={"game_name": game, "score": score, "session_token": token}, headers=auth(u))

    assert submit(ana, 50).json()["message"] == "Score saved successfully!"
    assert submit(beto, 70).status_code == 200
    assert submit(caro, 70).status_code == 200   # empate con beto, llega después
    assert submit(dani, 10).status_code == 200
    assert submit(ana, 40).json() == {"message": "Score not higher than existing best.", "score": 50}
    assert submit(ana, 10, game="otro").status_code == 422   # solo existe La Torre

    # Una fila por usuario y mes, con la mejor puntuación
    assert sorted((s.user_id, s.game_name, s.score) for s in rows(models.GameScore)) == sorted(
        [(ana.id, "balance", 50), (beto.id, "balance", 70), (caro.id, "balance", 70), (dani.id, "balance", 10)])

    # En el ranking nunca sale el correo: «Nombre I.» o «Jugador N»
    board = client.get("/api/games/balance/leaderboard").json()
    assert [(e["user_name"], e["score"]) for e in board] == [(f"Jugador {beto.id}", 70), ("Caro", 70), ("Ana P.", 50), ("Dani", 10)]
    assert "beto" not in json.dumps(board)
    assert len(client.get("/api/games/balance/leaderboard?limit=2").json()) == 2
    assert client.get("/api/games/nadie/leaderboard").json() == []

    # Ana bate su récord: pasa a primera
    assert submit(ana, 90).json()["message"] == "New high score saved!"
    assert len(rows(models.GameScore, user_id=ana.id, game_name="balance")) == 1
    assert [e["user_name"] for e in client.get("/api/games/balance/leaderboard").json()][0] == "Ana P."

    # Ranking mensual: lo de meses anteriores se conserva pero no cuenta, y este mes se empieza de cero
    [old] = rows(models.GameScore, user_id=dani.id)
    with Session(engine) as s2:
        o = s2.get(models.GameScore, old.id)
        o.created_at = datetime(2020, 1, 15)
        s2.add(o)
        s2.commit()
    assert "Dani" not in [e["user_name"] for e in client.get("/api/games/balance/leaderboard").json()]
    assert submit(dani, 5).json()["message"] == "Score saved successfully!"
    assert len(rows(models.GameScore, user_id=dani.id)) == 2


def test_balance_score_must_fit_play_time(client, db):
    u = new_user(db, "u@example.com")
    h = auth(u)

    def submit(score, token):
        return client.post("/api/games/score", json={"game_name": "balance", "score": score, "session_token": token}, headers=h)

    # 10 s de partida: como mucho 13 bloques x 30 puntos
    assert submit(391, game_token(u.id, seconds_ago=10)).status_code == 422
    assert submit(390, game_token(u.id, seconds_ago=10)).status_code == 200
    # Tope absoluto aunque la partida dure horas
    assert submit(6000, game_token(u.id, seconds_ago=10_000)).status_code == 422
    # Ni el token de otro jugador, ni uno caducado, ni el de la sesión valen
    other = new_user(db, "otro@example.com")
    assert submit(5, game_token(other.id)).status_code == 422
    expired = create_access_token({"sub": str(u.id), "type": "game", "game": "balance", "started": 0}, expires_minutes=-1)
    assert submit(5, expired).status_code == 422
    assert submit(5, h["Authorization"].split()[1]).status_code == 422
    # Y un token de partida no sirve para entrar en la cuenta
    token = client.post("/api/games/balance/start", headers=h).json()["session_token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_ai_conversations_keep_only_last_five(client, db):
    u = new_user(db, "u@example.com")
    ids = [client.post("/api/ai/chat", json={"message": f"consulta {i}"}, headers=auth(u)).json()["conversation_id"] for i in range(7)]
    convs = client.get("/api/ai/conversations", headers=auth(u)).json()
    assert len(convs) == 5 and count(models.AIConversation) == 5
    assert {c["id"] for c in convs} == set(ids[2:])


# ==========================================================================
# 4. ERRORES CONOCIDOS (los corregidos quedan como tests de regresión)
# ==========================================================================

@pytest.mark.parametrize("endpoint", ["user", "admin"])
def test_known_delete_property_with_favorites(endpoint, client, db):
    owner = new_user(db, "owner@example.com", role="admin")
    fan = new_user(db, "fan@example.com")
    prop = new_prop(db, owner_id=owner.id)
    client.post(f"/api/user/favorites/{prop.id}", headers=auth(fan))
    r = client.delete(f"/api/{endpoint}/properties/{prop.id}", headers=auth(owner))
    assert r.status_code == 200 and fetch(models.Property, prop.id) is None


def test_known_favorite_nonexistent_property(client, db):
    r = client.post("/api/user/favorites/999", headers=auth(new_user(db, "u@example.com")))
    assert r.status_code == 404


@pytest.mark.parametrize("status", ["draft", "sold", "pending"])
def test_known_detail_hides_non_public(status, client, db):
    prop = new_prop(db, status=status)
    assert client.get(f"/api/properties/{prop.id}").status_code == 404


def test_known_public_listing_hides_private_fields(client, db):
    new_prop(db, owner_id=new_user(db, "o@example.com").id, purchase_price=90000, monthly_income=800, total_cost=95000)
    [p] = client.get("/api/properties").json()
    assert not {"purchase_price", "monthly_income", "total_cost", "monthly_cost", "owner_id"} & set(p)


@pytest.mark.parametrize("payload", [{"role": "user"}, {"is_active": False}])
def test_known_last_admin_protected(payload, client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    r = client.put(f"/api/admin/users/{admin.id}", json=payload, headers=auth(admin))
    assert r.status_code == 400
    a = fetch(models.User, admin.id)
    assert (a.role, a.is_active) == ("admin", True)


@pytest.mark.parametrize("method", ["POST", "PUT"])
def test_known_arbitrary_role_rejected(method, client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    target = new_user(db, "t@example.com")
    if method == "POST":
        r = client.post("/api/admin/users", json={"email": "x@example.com", "password": "pw", "role": "superuser"}, headers=auth(admin))
    else:
        r = client.put(f"/api/admin/users/{target.id}", json={"role": "superuser"}, headers=auth(admin))
    assert r.status_code in (400, 422)
    assert not [u for u in rows(models.User) if u.role == "superuser"]


def test_known_upload_size_limit(client, db):
    big = b"\x89PNG" + b"\x00" * (15 * 1024 * 1024)
    r = client.post("/api/upload-images", files={"files": ("big.png", big, "image/png")}, headers=auth(new_user(db, "u@example.com")))
    assert r.status_code == 413


def test_known_upload_url_not_localhost(client, db):
    r = client.post("/api/upload-images", files={"files": ("a.png", PNG, "image/png")}, headers=auth(new_user(db, "u@example.com")))
    assert r.status_code == 200 and not r.json()["urls"][0].startswith("http://localhost:8000")


@pytest.mark.parametrize("score", [-5, 10**20])
def test_known_game_score_validated(score, client, db):
    u = new_user(db, "u@example.com")
    r = client.post("/api/games/score", json={"game_name": "balance", "score": score, "session_token": game_token(u.id)}, headers=auth(u))
    assert r.status_code in (400, 422)
    assert count(models.GameScore) == 0


@pytest.mark.parametrize("url", ["/api/properties?limit=100000", "/api/properties?limit=-1", "/api/properties?skip=-1",
                                 "/api/games/balance/leaderboard?limit=100000", "/api/games/balance/leaderboard?limit=-1"])
def test_known_pagination_bounded(url, client, db):
    assert client.get(url).status_code == 422


# ==========================================================================
# 5. ERRORES NUEVOS ENCONTRADOS (los corregidos quedan como tests de regresión)
# ==========================================================================

def _user_with(kind, client, db):
    """Crea un usuario con un recurso dependiente del tipo indicado."""
    x = new_user(db, f"{kind}@example.com")
    hx = auth(x)
    prop = new_prop(db, owner_id=new_user(db, f"seller-{kind}@example.com").id)
    if kind == "favorite":
        client.post(f"/api/user/favorites/{prop.id}", headers=hx)
    elif kind == "saved_search":
        client.post("/api/user/searches", json={"name": "a"}, headers=hx)
    elif kind == "game_score":
        client.post("/api/games/score", json={"game_name": "balance", "score": 1, "session_token": game_token(x.id)}, headers=hx)
    elif kind == "ai_conversation":
        client.post("/api/ai/chat", json={"message": "hola"}, headers=hx)
    elif kind == "sent_message":
        client.post("/api/user/messages", json={"property_id": prop.id, "content": "x"}, headers=hx)
    elif kind == "received_message":
        p = new_prop(db, owner_id=x.id)
        client.post("/api/user/messages", json={"property_id": p.id, "content": "x"}, headers=auth(new_user(db, f"buyer-{kind}@example.com")))
    elif kind == "property":
        new_prop(db, owner_id=x.id, title="Huérfana")
    return x


@pytest.mark.parametrize("kind", [
    "favorite",
    "saved_search",
    "game_score",
    "ai_conversation",
    "sent_message",
    "received_message",
    "property",
])
def test_delete_user_with_dependents(kind, client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    x = _user_with(kind, client, db)
    r = client.delete(f"/api/admin/users/{x.id}", headers=auth(admin))
    assert r.status_code == 200, r.text
    assert fetch(models.User, x.id) is None
    if kind == "property":
        # Comportamiento actual: el anuncio queda huérfano (owner_id NULL) y sigue publicado
        [p] = rows(models.Property, title="Huérfana")
        assert p.owner_id is None


@pytest.mark.parametrize("endpoint", ["user", "admin"])
@pytest.mark.parametrize("dependent", [
    "message",
    "investment",
])
def test_delete_property_with_dependents(dependent, endpoint, client, db):
    owner = new_user(db, "owner@example.com", role="admin")
    buyer = new_user(db, "buyer@example.com", role="investor")
    prop = new_prop(db, owner_id=owner.id)
    if dependent == "message":
        client.post("/api/user/messages", json={"property_id": prop.id, "content": "x"}, headers=auth(buyer))
    else:
        _investment(db, buyer.id, prop.id)
    r = client.delete(f"/api/{endpoint}/properties/{prop.id}", headers=auth(owner))
    assert r.status_code == 200, r.text
    assert fetch(models.Property, prop.id) is None


def test_new_admin_create_user_requires_password(client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    r = client.post("/api/admin/users", json={"email": "sinclave@example.com"}, headers=auth(admin))
    assert r.status_code in (400, 422)
    assert login(client, "sinclave@example.com", "password123").status_code == 401


def test_new_admin_create_user_without_email(client, db):
    r = client.post("/api/admin/users", json={"password": "pw"}, headers=auth(new_user(db, "admin@example.com", role="admin")))
    assert r.status_code in (400, 422)


def test_new_admin_create_user_invalid_email(client, db):
    r = client.post("/api/admin/users", json={"email": "no-es-email", "password": "pw"}, headers=auth(new_user(db, "admin@example.com", role="admin")))
    assert r.status_code in (400, 422)
    assert rows(models.User, email="no-es-email") == []


def test_new_admin_update_user_bad_is_active(client, db):
    admin = new_user(db, "admin@example.com", role="admin")
    target = new_user(db, "t@example.com")
    r = client.put(f"/api/admin/users/{target.id}", json={"is_active": "no"}, headers=auth(admin))
    assert r.status_code in (400, 422)


@pytest.mark.parametrize("payload", [
    pytest.param({"title": "x", "price": "abc", "type": "piso"}, id="price-no-numerico"),
    pytest.param({"title": "x", "price": 1, "type": "piso", "coordinates": None}, id="coordinates-null"),
])
def test_new_user_property_payload_validation(payload, client, db):
    r = client.post("/api/user/properties", json=payload, headers=auth(new_user(db, "u@example.com")))
    assert r.status_code in (400, 422)


def test_new_saved_search_null_name(client, db):
    r = client.post("/api/user/searches", json={"name": None, "filters": {}}, headers=auth(new_user(db, "u@example.com")))
    assert r.status_code in (200, 400, 422)


def test_new_import_csv_empty_price(client, db):
    h = auth(new_user(db, "admin@example.com", role="admin"))
    csv = b"title,price,location\nBuena,100000,Lorca\nSin precio,,Lorca\n"
    r = client.post("/api/admin/properties/import", files={"file": ("p.csv", csv, "text/csv")}, headers=h)
    assert r.status_code == 200 and r.json()["properties_added"] == 1 and r.json()["errors"] == 1
    assert [p.title for p in rows(models.Property)] == ["Buena"]


def test_new_import_csv_empty_text_cells(client, db):
    h = auth(new_user(db, "admin@example.com", role="admin"))
    csv = b"title,price,type,location\n,5,,\n"
    assert client.post("/api/admin/properties/import", files={"file": ("p.csv", csv, "text/csv")}, headers=h).status_code == 200
    [p] = rows(models.Property)
    assert "nan" not in (p.title, p.type, p.city)


def test_new_public_status_sets_consistent(client, db):
    h = auth(new_user(db, "admin@example.com", role="admin"))
    pid = client.post("/api/admin/properties", json={"title": "Del admin", "price": 1, "type": "piso"}, headers=h).json()["id"]
    assert pid in {p["id"] for p in client.get("/api/properties").json()}
    new_prop(db, status="reserved", title="Reservada")
    listing = {p["title"] for p in client.get("/api/properties").json()}
    with Session(engine) as s:
        ai_visible = {p.title for p in s.exec(get_allowed_properties_statement(None, None)).all()}
    assert listing == ai_visible


def test_new_favorites_do_not_leak_non_public(client, db):
    owner = new_user(db, "owner@example.com")
    draft = new_prop(db, owner_id=owner.id, status="draft", title="Borrador privado", purchase_price=1)
    h = auth(new_user(db, "spy@example.com"))
    r = client.post(f"/api/user/favorites/{draft.id}", headers=h)
    assert r.status_code == 404
    assert client.get("/api/user/favorites", headers=h).json() == []


def test_new_upload_checks_content(client, db):
    r = client.post("/api/upload-images", files={"files": ("a.png", b"MZ\x90\x00 not an image", "image/png")}, headers=auth(new_user(db, "u@example.com")))
    assert r.status_code == 400


def test_new_admin_can_assign_realtor(client, db):
    h = auth(new_user(db, "admin@example.com", role="admin"))
    realtor = new_user(db, "r@example.com", role="realtor")
    pid = client.post("/api/admin/properties", json={"title": "X", "price": 1, "type": "piso", "realtor_id": realtor.id}, headers=h).json()["id"]
    client.put(f"/api/admin/properties/{pid}", json={"realtor_id": realtor.id}, headers=h)
    assert fetch(models.Property, pid).realtor_id == realtor.id


def test_new_investor_dashboard_matches_portfolio(client, db):
    investor = new_user(db, "inv@example.com", role="investor")
    dash = client.get("/api/investor/dashboard", headers=auth(investor)).json()
    assert dash["total_properties"] == 0 and dash["portfolio_value"] == 0


def test_new_admin_dashboard_numbers_from_db(client, db):
    dash = client.get("/api/admin/dashboard", headers=auth(new_user(db, "admin@example.com", role="admin"))).json()
    assert (dash["total_transactions"], dash["total_revenue"], dash["properties_sold_this_month"], dash["properties_rented_this_month"]) == (0, 0, 0, 0)
