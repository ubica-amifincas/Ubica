"""Servidor MCP público (/mcp): lo que ve el agente de IA de un cliente."""
import pytest
from fastapi.testclient import TestClient

import mcp_server
from main import app

HEADERS = {"accept": "application/json, text/event-stream", "content-type": "application/json"}


@pytest.fixture
def mcp():
    # Con "with" arranca el lifespan, que pone en marcha el gestor de sesiones MCP
    with TestClient(app) as c:
        def call(method, params=None, path="/mcp", headers=None):
            r = c.post(path, headers={**HEADERS, **(headers or {})}, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}})
            return r
        yield call


def tool(mcp, name, **args):
    r = mcp("tools/call", {"name": name, "arguments": args})
    assert r.status_code == 200, r.text
    result = r.json()["result"]
    return result.get("structuredContent", result)


def test_initialize_y_lista_de_herramientas(mcp):
    r = mcp("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "1"}})
    assert r.status_code == 200 and "AMI Fincas" in r.json()["result"]["instructions"]
    for path in ("/mcp", "/mcp/"):
        tools = {t["name"]: t for t in mcp("tools/list", path=path).json()["result"]["tools"]}
        assert set(tools) == {"buscar_inmuebles", "ver_inmueble", "zonas_con_oferta", "calcular_hipoteca", "calcular_rentabilidad", "solicitar_informacion"}
    assert tools["buscar_inmuebles"]["annotations"]["readOnlyHint"] is True
    assert tools["solicitar_informacion"]["annotations"]["readOnlyHint"] is False


def test_buscar_solo_publicados_y_sin_datos_privados(mcp, make_user, make_property):
    owner = make_user()
    make_property(title="Ático luminoso con terraza", type="penthouse", status="for-sale", city="Murcia", price=210000,
                  bedrooms=3, description="Terraza de 40 m2", purchase_price=99999, owner_id=owner.id)
    make_property(title="Piso en alquiler", type="flat", status="for-rent", city="Cartagena", price=750, bedrooms=2)
    make_property(title="Borrador oculto", status="draft", city="Murcia", owner_id=owner.id)
    make_property(title="Pendiente de revisión", status="pending-review", city="Murcia")

    todos = tool(mcp, "buscar_inmuebles")
    assert {p["titulo"] for p in todos["inmuebles"]} == {"Ático luminoso con terraza", "Piso en alquiler"}
    r = tool(mcp, "buscar_inmuebles", operacion="venta", tipo="piso", ubicacion="murcia", palabras="terrazas luminosas")
    assert [p["titulo"] for p in r["inmuebles"]] == ["Ático luminoso con terraza"]
    atico = r["inmuebles"][0]
    assert atico["url"] == f"https://ubica.amifincas.es/inmueble/{atico['id']}-atico-luminoso-con-terraza" and atico["tipo"] == "ático"
    assert tool(mcp, "buscar_inmuebles", operacion="alquiler")["total"] == 1
    assert tool(mcp, "buscar_inmuebles", precio_max=500)["mensaje"]
    assert tool(mcp, "buscar_inmuebles", habitaciones_min=3)["total"] == 1

    ficha = tool(mcp, "ver_inmueble", inmueble_id=atico["id"])
    assert ficha["descripcion"] == "Terraza de 40 m2"
    assert not {"purchase_price", "owner_id", "realtor_id", "review_note"} & set(ficha) and "99999" not in str(ficha)
    borrador = make_property(title="Otro borrador", status="draft")
    assert "error" in tool(mcp, "ver_inmueble", inmueble_id=borrador.id)


def test_cerca_de_un_punto(mcp, make_property):
    make_property(title="Junto a la catedral", latitude=37.9838, longitude=-1.1280)
    make_property(title="En Cartagena", latitude=37.6257, longitude=-0.9966)
    r = tool(mcp, "buscar_inmuebles", latitud=37.9922, longitud=-1.1307, radio_km=5)
    assert [p["titulo"] for p in r["inmuebles"]] == ["Junto a la catedral"]


def test_zonas_y_calculadoras(mcp, make_property):
    make_property(city="Murcia", status="for-sale", price=200000)
    make_property(city="Murcia", status="for-rent", price=800)
    make_property(city="Murcia", status="draft", price=1)
    zonas = tool(mcp, "zonas_con_oferta")
    assert zonas["zonas"] == [{"ciudad": "Murcia", "total": 2, "en_alquiler": 1, "en_venta": 1, "precio_min_eur": 800, "precio_max_eur": 200000}]
    assert tool(mcp, "calcular_hipoteca", precio=200000)["cuota_mensual"] == 758.74
    assert tool(mcp, "calcular_rentabilidad", precio_compra=150000, alquiler_mensual=800)["roi_bruto_porcentaje"] == 6.4


def test_solicitar_informacion(mcp, make_property, monkeypatch):
    sent = []

    async def fake_send(to, subject, html, reply_to=None):
        sent.append((to, subject, html, reply_to))
        return {"status": "success"}

    monkeypatch.setattr(mcp_server, "send_email_resend", fake_send)
    p = make_property(title="Ático en Murcia")
    base = {"nombre": "Ana López", "email": "ana@example.com", "mensaje": "¿Sigue disponible? Me gustaría verlo."}

    assert tool(mcp, "solicitar_informacion", **base, consentimiento=False)["enviada"] is False
    assert tool(mcp, "solicitar_informacion", **{**base, "email": "no-es-correo"}, consentimiento=True)["enviada"] is False
    assert "error" in tool(mcp, "solicitar_informacion", **base, consentimiento=True, inmueble_id=9999)
    assert not sent

    r = tool(mcp, "solicitar_informacion", **base, consentimiento=True, inmueble_id=p.id, fecha_visita_preferida="viernes por la tarde")
    assert r["enviada"] is True and r["visita_reservada"] is False
    to, subject, html, reply_to = sent[0]
    assert to == "info@amifincas.es" and reply_to == "ana@example.com" and "Ático en Murcia" in subject
    assert "viernes por la tarde" in html and f"/inmueble/{p.id}-atico-en-murcia" in html

    # Cinco por hora y por IP: la sexta ya no se envía
    for _ in range(4):
        assert tool(mcp, "solicitar_informacion", **base, consentimiento=True)["enviada"] is True
    assert tool(mcp, "solicitar_informacion", **base, consentimiento=True)["enviada"] is False
    assert len(sent) == 5


def test_limite_de_peticiones(mcp, monkeypatch):
    monkeypatch.setattr(mcp_server.request_limiter, "max_hits", 3)
    codes = [mcp("tools/list", headers={"x-forwarded-for": "203.0.113.7"}).status_code for _ in range(4)]
    assert codes == [200, 200, 200, 429]
    assert mcp("tools/list", headers={"x-forwarded-for": "203.0.113.8"}).status_code == 200


def test_slug_igual_que_el_frontend():
    assert mcp_server.slugify("Ático con vistas en Murcia!") == "atico-con-vistas-en-murcia"
    assert mcp_server.slugify("  --Piso ñ 3 hab.-- ") == "piso-n-3-hab"
    assert len(mcp_server.slugify("a" * 200)) == 80
