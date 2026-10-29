import asyncio
import json
from types import SimpleNamespace

from conftest import auth
from services.ai import chat, tools


def run(coro):
    return asyncio.run(coro)


def test_calcular_hipoteca():
    r = json.loads(run(tools.execute_tool("calcular_hipoteca", {"precio": 200000}, None, "guest")))
    assert r["capital_financiado"] == 160000 and r["cuota_mensual"] == 758.74


def test_buscar_propiedades_respeta_visibilidad(make_user, make_property):
    owner = make_user()
    make_property(title="Piso público", status="for-sale")
    make_property(title="Piso privado", status="draft", owner_id=owner.id)
    guest = json.loads(run(tools.execute_tool("buscar_propiedades", {"ubicacion": "cartagena", "tipo": "piso"}, None, "guest")))
    assert [p["titulo"] for p in guest] == ["Piso público"]
    mine = json.loads(run(tools.execute_tool("buscar_propiedades", {"ubicacion": "Cartagena"}, owner.id, "user")))
    assert {p["titulo"] for p in mine} == {"Piso público", "Piso privado"}


def test_buscar_propiedades_estado_en_espanol(make_property):
    make_property(title="Villa en venta", type="villa", status="for-sale")
    make_property(title="Villa en alquiler", type="villa", status="for-rent")
    venta = json.loads(run(tools.execute_tool("buscar_propiedades", {"tipo": "villa", "estado": "venta"}, None, "guest")))
    assert [p["titulo"] for p in venta] == ["Villa en venta"]
    alquiler = json.loads(run(tools.execute_tool("buscar_propiedades", {"estado": "en alquiler"}, None, "guest")))
    assert [p["titulo"] for p in alquiler] == ["Villa en alquiler"]
    assert len(json.loads(run(tools.execute_tool("buscar_propiedades", {"estado": "for-sale"}, None, "guest")))) == 1


def test_herramientas_sin_registro_y_desconocidas():
    assert json.loads(run(tools.execute_tool("mis_favoritos", {}, None, "guest")))["requiere_registro"] is True
    assert json.loads(run(tools.execute_tool("estadisticas_cartera", {}, 1, "user")))["requiere_rol"] is True
    assert run(tools.execute_tool("no_existe", {}, None, "guest")) == "{}"


def test_chat_con_proveedor_y_tool_calling(client, make_user, make_property, monkeypatch):
    """Simula un proveedor compatible con OpenAI que pide una herramienta y luego responde."""
    prop = make_property(title="Villa con piscina", type="villa", status="for-sale")
    calls = []

    class FakeCompletions:
        async def create(self, **kwargs):
            calls.append(kwargs)
            if len(calls) == 1:
                tool_call = SimpleNamespace(id="t1", function=SimpleNamespace(name="buscar_propiedades", arguments='{"ubicacion": "Cartagena"}'))
                return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=[tool_call], content=None))])
            tool_result = json.loads(kwargs["messages"][-1]["content"])
            text = f"Encontré {tool_result[0]['titulo']}: [Ver Propiedad](/property/{tool_result[0]['id']})"
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=None, content=text))])

    class FakeClient:
        def __init__(self, api_key, base_url, **kwargs):
            self.chat = SimpleNamespace(completions=FakeCompletions())

    import openai
    monkeypatch.setattr(openai, "AsyncOpenAI", FakeClient)
    monkeypatch.setattr(chat, "PROVIDERS", [("groq", "fake-key", "https://example.invalid", "fake-model")])
    import routers.ai
    monkeypatch.setattr(routers.ai, "PROVIDERS", chat.PROVIDERS)

    r = client.post("/api/ai/chat", json={"message": "villas en Cartagena"}, headers=auth(make_user()))
    body = r.json()
    assert body["provider"] == "groq" and f"/property/{prop.id}" in body["message"]
    assert body["conversation_id"] is not None
    assert calls[0]["tools"] and "Invitado" not in calls[0]["messages"][0]["content"]


def fake_openai(monkeypatch, replies):
    """Cliente falso por proveedor: replies[clave] es el texto, None (respuesta vacía) o una excepción."""
    used = []

    class FakeClient:
        def __init__(self, api_key, base_url, **kwargs):
            assert kwargs.get("timeout"), "cada proveedor debe tener límite de tiempo"

            async def create(**_):
                used.append(api_key)
                reply = replies[api_key]
                if isinstance(reply, Exception):
                    raise reply
                return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=None, content=reply))])

            self.chat = SimpleNamespace(completions=SimpleNamespace(create=create))

    import openai
    import routers.ai
    monkeypatch.setattr(openai, "AsyncOpenAI", FakeClient)
    providers = [("openrouter", "k-or", "https://or.invalid", "m-or"), ("groq", "k-groq", "https://groq.invalid", "m-groq")]
    monkeypatch.setattr(chat, "PROVIDERS", providers)
    monkeypatch.setattr(routers.ai, "PROVIDERS", providers)
    return used


def test_chat_pasa_a_groq_si_openrouter_falla(client, monkeypatch):
    used = fake_openai(monkeypatch, {"k-or": TimeoutError("sin respuesta"), "k-groq": "Hola, soy Ubica"})
    body = client.post("/api/ai/chat", json={"message": "hola"}).json()
    assert body["provider"] == "groq" and body["model"] == "m-groq" and body["message"] == "Hola, soy Ubica"
    assert used == ["k-or", "k-groq"]


def test_chat_respuesta_vacia_no_se_muestra(client, monkeypatch):
    fake_openai(monkeypatch, {"k-or": "   ", "k-groq": None})
    body = client.post("/api/ai/chat", json={"message": "busco un piso"}).json()
    assert body["provider"] == "mock" and body["message"].strip()


def test_chat_usa_openrouter_si_responde(client, monkeypatch):
    used = fake_openai(monkeypatch, {"k-or": "Respuesta OpenRouter", "k-groq": "no"})
    assert client.post("/api/ai/chat", json={"message": "hola"}).json()["provider"] == "openrouter"
    assert used == ["k-or"]


def test_config_comprueba_proveedores(client, make_user, monkeypatch):
    fake_openai(monkeypatch, {"k-or": RuntimeError("401 clave no válida"), "k-groq": "OK"})
    admin = auth(make_user(email="a@example.com", role="admin"))
    plain = client.get("/api/ai/config", headers=admin).json()
    assert [p["provider"] for p in plain["providers"]] == ["openrouter", "groq"] and plain["has_api_key"] is True
    checked = {p["provider"]: p for p in client.get("/api/ai/config?check=true", headers=admin).json()["providers"]}
    assert checked["groq"]["ok"] is True and checked["openrouter"]["ok"] is False
    assert "401" in checked["openrouter"]["error"]


def test_herramientas_de_mercado_ignoran_borradores(make_property):
    a = make_property(title="Pública A", status="for-sale", type="piso", price=100000)
    b = make_property(title="Pública B", status="for-sale", type="piso", price=110000)
    draft = make_property(title="Borrador", status="draft", type="piso", price=105000)
    comp = json.loads(run(tools.execute_tool("comparar_propiedades", {"ids": [a.id, b.id, draft.id]}, None, "guest")))
    assert [p["titulo"] for p in comp["comparativa"]] == ["Pública A", "Pública B"]
    zona = json.loads(run(tools.execute_tool("analisis_zona", {"zona": "Cartagena"}, None, "guest")))
    assert zona["total_propiedades"] == 2
    similares = run(tools.execute_tool("propiedades_similares", {"propiedad_id": a.id}, None, "guest"))
    assert "Borrador" not in similares and "Pública B" in similares
    assert "error" in json.loads(run(tools.execute_tool("propiedades_similares", {"propiedad_id": draft.id}, None, "guest")))
