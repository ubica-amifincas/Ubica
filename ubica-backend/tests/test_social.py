"""Publicar el vídeo de un inmueble en Instagram: permisos, texto, comprobaciones y el flujo de la Graph API (simulada)."""
import pytest

import config
import models
from services import instagram
from conftest import auth

IMAGES = [f"https://example.test/foto-{i}.jpg" for i in range(12)]


@pytest.fixture
def connected(monkeypatch):
    monkeypatch.setattr(config, "INSTAGRAM_ACCESS_TOKEN", "token-de-prueba")
    monkeypatch.setattr(config, "INSTAGRAM_USER_ID", "1789")
    monkeypatch.setattr(instagram, "POLL_SECONDS", 0)


@pytest.fixture
def video(monkeypatch):
    """Índice de vídeos con el vídeo al día del inmueble que se pida."""
    entries = {}

    async def fake_entry(property_id):
        return entries.get(property_id)

    monkeypatch.setattr(instagram, "video_entry", fake_entry)

    def _ready(p, **overrides):
        entries[p.id] = {"vertical": f"https://cdn.test/{p.id}-v.mp4", "images": IMAGES[:10], "price": p.price, **overrides}
    return _ready


@pytest.fixture
def graph(monkeypatch):
    """Graph API simulada: guarda las llamadas y responde como Instagram."""
    calls = []
    state = {"status_codes": ["IN_PROGRESS", "FINISHED"], "fail_on": None}

    async def fake_graph(http, method, path, **params):
        calls.append((method, path, params))
        if state["fail_on"] and state["fail_on"] in path:
            raise instagram.InstagramError("Token caducado")
        if path.endswith("/media"):
            return {"id": "contenedor-1"}
        if path == "contenedor-1":
            return {"status_code": state["status_codes"].pop(0)}
        if path.endswith("/media_publish"):
            return {"id": "reel-9"}
        if path == "reel-9":
            return {"permalink": "https://www.instagram.com/reel/abc/"}
        raise AssertionError(path)

    monkeypatch.setattr(instagram, "_graph", fake_graph)
    return calls, state


@pytest.fixture
def listing(make_property):
    return make_property(title="Dúplex en Villananitos", type="duplex", price=138000, city="San Pedro del Pinatar",
                         address="Playa Villananitos", bedrooms=2, bathrooms=2, area=110, images=IMAGES,
                         features=["terraza", "garaje"], description="Se vende acogedora vivienda. Lista para entrar.")


def test_solo_el_equipo_de_ami(client, make_user, listing):
    outsider = make_user(email="agencia@otra.test", role="realtor")
    customer = make_user(email="cliente@example.com")
    for user in (outsider, customer):
        assert client.get(f"/api/social/instagram/{listing.id}", headers=auth(user)).status_code == 403
    assert client.get(f"/api/social/instagram/{listing.id}").status_code in (401, 403)

    team = make_user(email="info@amifincas.es", role="realtor")  # cuenta del equipo (STAFF_ROLES)
    admin = make_user(email="jefe@example.com", role="admin")
    for user in (team, admin):
        assert client.get(f"/api/social/instagram/{listing.id}", headers=auth(user)).status_code == 200


def test_estado_y_texto_propuesto(client, make_user, listing, video):
    admin = make_user(role="admin")
    data = client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()
    assert data["configured"] is False and data["post"] is None
    assert data["video"] == "missing"
    caption = data["caption"]
    assert caption.startswith("🏡 Dúplex en venta en Playa Villananitos, San Pedro del Pinatar")
    assert "💶 138.000 €" in caption and "2 habitaciones" in caption and "110 m²" in caption
    assert "Terraza · Garaje" in caption and f"Ref. {listing.id}" in caption
    assert "#SanPedroDelPinatar #MarMenor" in caption and "#Duplex" in caption

    video(listing)
    assert client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()["video"] == "ready"
    video(listing, price=150000)
    assert client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()["video"] == "outdated"


def test_alquiler_lleva_precio_al_mes(make_property):
    p = make_property(status="for-rent", price=750, city="Murcia", type="flat")
    caption = instagram.build_caption(p)
    assert "750 €/mes" in caption and "#PisosEnAlquiler" in caption and "#Murcia" in caption


def test_sin_cuenta_conectada(client, make_user, listing, video):
    video(listing)
    r = client.post(f"/api/social/instagram/{listing.id}", json={"caption": "Hola"}, headers=auth(make_user(role="admin")))
    assert r.status_code == 503


def test_publica_el_reel(client, make_user, listing, video, connected, graph, db):
    calls, _ = graph
    video(listing)
    admin = make_user(role="admin")
    r = client.post(f"/api/social/instagram/{listing.id}", json={"caption": "Texto revisado"}, headers=auth(admin))
    assert r.status_code == 200, r.text

    create = calls[0]
    assert create[0] == "POST" and create[1] == "1789/media"
    assert create[2]["media_type"] == "REELS" and create[2]["caption"] == "Texto revisado"
    assert create[2]["video_url"] == f"https://cdn.test/{listing.id}-v.mp4"
    assert [c[1] for c in calls[1:]] == ["contenedor-1", "contenedor-1", "1789/media_publish", "reel-9"]

    post = client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()["post"]
    assert post["status"] == "published" and post["permalink"] == "https://www.instagram.com/reel/abc/"
    # No se publica dos veces
    again = client.post(f"/api/social/instagram/{listing.id}", json={"caption": "Otra vez"}, headers=auth(admin))
    assert again.status_code == 409


def test_error_de_instagram_queda_guardado_y_se_puede_reintentar(client, make_user, listing, video, connected, graph):
    calls, state = graph
    state["fail_on"] = "/media"
    video(listing)
    admin = make_user(role="admin")
    client.post(f"/api/social/instagram/{listing.id}", json={"caption": "Texto"}, headers=auth(admin))
    post = client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()["post"]
    assert post["status"] == "error" and "Token caducado" in post["error"]

    state["fail_on"] = None
    r = client.post(f"/api/social/instagram/{listing.id}", json={"caption": "Texto"}, headers=auth(admin))
    assert r.status_code == 200
    assert client.get(f"/api/social/instagram/{listing.id}", headers=auth(admin)).json()["post"]["status"] == "published"


def test_comprobaciones_antes_de_publicar(client, make_user, make_property, listing, video, connected, graph):
    admin = make_user(role="admin")
    url = f"/api/social/instagram/{listing.id}"
    assert client.post(url, json={"caption": "Texto"}, headers=auth(admin)).status_code == 409  # sin vídeo
    video(listing, images=IMAGES[1:11])
    r = client.post(url, json={"caption": "Texto"}, headers=auth(admin))
    assert r.status_code == 409 and "rehaciendo" in r.json()["detail"]

    video(listing)
    too_many = " ".join(f"#tag{i}" for i in range(31))
    assert client.post(url, json={"caption": too_many}, headers=auth(admin)).status_code == 422
    assert client.post(url, json={"caption": ""}, headers=auth(admin)).status_code == 422

    sold = make_property(status="sold", images=IMAGES)
    video(sold)
    assert client.post(f"/api/social/instagram/{sold.id}", json={"caption": "Texto"}, headers=auth(admin)).status_code == 409
    assert client.post("/api/social/instagram/99999", json={"caption": "Texto"}, headers=auth(admin)).status_code == 404
    assert graph[0] == []  # nada llegó a Instagram


def test_el_token_se_renueva_solo_y_manda_el_de_render(connected, monkeypatch):
    import asyncio
    calls = []

    async def fake_refresh(token):
        calls.append(token)
        return {"access_token": f"renovado-{len(calls)}", "expires_in": 5184000}

    monkeypatch.setattr(instagram, "_refresh_call", fake_refresh)
    assert instagram.access_token() == "token-de-prueba"
    assert asyncio.run(instagram.refresh_token_if_due()) is True
    assert calls == ["token-de-prueba"] and instagram.access_token() == "renovado-1"
    # Hasta dentro de una semana no vuelve a renovarse
    assert asyncio.run(instagram.refresh_token_if_due()) is False and len(calls) == 1

    # Si en Render se pone otro token, se usa ese y se renueva a partir de él
    monkeypatch.setattr(config, "INSTAGRAM_ACCESS_TOKEN", "token-nuevo")
    assert instagram.access_token() == "token-nuevo"
    assert asyncio.run(instagram.refresh_token_if_due()) is True and calls[-1] == "token-nuevo"

    # Con una página de Facebook el token no caduca: no se renueva
    monkeypatch.setattr(config, "INSTAGRAM_GRAPH_URL", "https://graph.facebook.com/v23.0")
    assert asyncio.run(instagram.refresh_token_if_due()) is False
