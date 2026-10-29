"""Revisión de anuncios: quién publica directamente y cómo los aprueba o rechaza el admin."""
from sqlalchemy import create_engine, inspect, text

import database
import models
from conftest import auth


def create(client, user, **body):
    data = {"title": "Piso", "price": 100000, "type": "piso", "status": "for-sale", **body}
    return client.post("/api/user/properties", json=data, headers=auth(user)).json()


def public_ids(client):
    return {p["id"] for p in client.get("/api/properties").json()}


def test_admin_approves_with_requested_status_or_rejects_with_reason(client, make_user):
    owner = make_user()
    admin = auth(make_user(email="admin@example.com", role="admin"))
    rent = create(client, owner, status="for-rent")
    assert (rent["status"], rent["pending_status"]) == ("pending-review", "for-rent")
    assert rent["id"] not in public_ids(client)

    # Aprobar: se publica con el estado que pidió
    r = client.put(f"/api/admin/properties/{rent['id']}", json={"status": rent["pending_status"]}, headers=admin).json()
    assert (r["status"], r["pending_status"]) == ("for-rent", None)
    assert rent["id"] in public_ids(client)

    # Rechazar: no se publica y el anunciante ve el motivo
    spam = create(client, owner, title="Spam")
    r = client.put(f"/api/admin/properties/{spam['id']}", json={"status": "rejected", "reviewNote": "Fotos de otro anuncio"}, headers=admin).json()
    assert (r["status"], r["review_note"], r["pending_status"]) == ("rejected", "Fotos de otro anuncio", "for-sale")
    mine = {p["id"]: p for p in client.get("/api/user/properties", headers=auth(owner)).json()}
    assert mine[spam["id"]]["review_note"] == "Fotos de otro anuncio"

    # Si lo corrige y lo reenvía, vuelve a revisión y se borra el motivo
    r = client.put(f"/api/user/properties/{spam['id']}", json={"title": "Piso real", "status": "rejected"}, headers=auth(owner)).json()
    assert (r["status"], r["pending_status"], r["review_note"]) == ("pending-review", "for-sale", None)


def test_owner_cannot_publish_or_reject_by_hand(client, make_user):
    owner = make_user()
    p = create(client, owner, status="draft")
    assert p["status"] == "draft"
    for status in ("for-sale", "available", "reserved"):
        r = client.put(f"/api/user/properties/{p['id']}", json={"status": status}, headers=auth(owner)).json()
        assert r["status"] == "pending-review"
    # Enviar "pendiente" tal cual mantiene lo que pidió
    r = client.put(f"/api/user/properties/{p['id']}", json={"status": "pending-review", "price": 1}, headers=auth(owner)).json()
    assert (r["status"], r["pending_status"]) == ("pending-review", "reserved")
    assert p["id"] not in public_ids(client)


def test_approved_listing_can_be_reserved_or_sold_without_review(client, make_user):
    owner = make_user()
    admin = auth(make_user(email="admin@example.com", role="admin"))
    p = create(client, owner)
    client.put(f"/api/admin/properties/{p['id']}", json={"status": "for-sale"}, headers=admin)
    r = client.put(f"/api/user/properties/{p['id']}", json={"status": "reserved"}, headers=auth(owner)).json()
    assert r["status"] == "reserved" and p["id"] in public_ids(client)
    # Pasar de venta a alquiler cambia lo que se anuncia: vuelve a revisión
    r = client.put(f"/api/user/properties/{p['id']}", json={"status": "for-rent"}, headers=auth(owner)).json()
    assert (r["status"], r["pending_status"]) == ("pending-review", "for-rent")
    r = client.put(f"/api/user/properties/{p['id']}", json={"status": "sold"}, headers=auth(owner)).json()
    assert r["status"] == "sold"


def test_realtor_publishes_directly_only_once_approved(client, make_user):
    admin = auth(make_user(email="admin@example.com", role="admin"))
    agency = make_user(email="agencia@example.com", role="realtor", is_approved=False)
    assert create(client, agency)["status"] == "pending-review"

    r = client.put(f"/api/admin/users/{agency.id}", json={"is_approved": True}, headers=admin)
    assert r.status_code == 200 and r.json()["is_approved"] is True
    p = create(client, agency, title="Ya aprobada")
    assert p["status"] == "for-sale" and p["id"] in public_ids(client)

    # Convertir a alguien en inmobiliaria desde el panel ya cuenta como aprobarla
    user = make_user(email="particular@example.com")
    client.put(f"/api/admin/users/{user.id}", json={"role": "realtor"}, headers=admin)
    assert create(client, user)["status"] == "for-sale"


def test_reviewed_statuses_are_not_public(client, make_user, make_property):
    owner = make_user()
    hidden = [make_property(status=s, owner_id=owner.id) for s in ("pending-review", "rejected")]
    assert public_ids(client).isdisjoint(p.id for p in hidden)
    assert client.get(f"/api/properties/{hidden[0].id}").status_code == 404


def test_ensure_columns_adds_missing_columns_to_old_tables(tmp_path, monkeypatch):
    old = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with old.begin() as conn:
        conn.execute(text('CREATE TABLE "user" (id INTEGER PRIMARY KEY, email VARCHAR)'))
        conn.execute(text('CREATE TABLE property (id INTEGER PRIMARY KEY, title VARCHAR, review_note VARCHAR)'))
        conn.execute(text("INSERT INTO \"user\" (id, email) VALUES (1, 'a@example.com')"))
    monkeypatch.setattr(database, "engine", old)
    database.ensure_columns()
    database.ensure_columns()  # una segunda vez no hace nada
    columns = {t: {c["name"] for c in inspect(old).get_columns(t)} for t in ("user", "property")}
    assert {"is_approved", "terms_accepted_at"} <= columns["user"]
    assert {"pending_status", "review_note"} <= columns["property"]
    with old.connect() as conn:
        # Los usuarios que ya existían quedan aprobados
        assert conn.execute(text('SELECT is_approved FROM "user"')).scalar() in (1, True)
