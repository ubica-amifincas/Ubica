"""Borrador de anuncio a partir del mensaje del vendedor (WhatsApp)."""
import json
from types import SimpleNamespace

import routers.ai
from conftest import auth
from services.ai import listing

MESSAGE = ("Hola! Vendo piso en Murcia, calle Mayor 12. 3 habitaciones, 2 baños, 95 m2, terraza y garaje. "
           "Precio 185.000 €. Mi móvil 600 123 456")


def fake_ai(monkeypatch, reply):
    """reply: texto que devuelve el modelo, o una excepción."""
    class FakeClient:
        def __init__(self, **kwargs):
            async def create(**_):
                if isinstance(reply, Exception):
                    raise reply
                return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=reply))])
            self.chat = SimpleNamespace(completions=SimpleNamespace(create=create))

    import openai
    monkeypatch.setattr(openai, "AsyncOpenAI", FakeClient)
    monkeypatch.setattr(listing, "PROVIDERS", [("groq", "k", "https://x.invalid", "m")])


def test_ai_draft_is_cleaned_and_has_no_contact_data(client, make_user, monkeypatch):
    fake_ai(monkeypatch, "Aquí tienes:\n" + json.dumps({
        "operation": "sale", "type": "Piso", "price": "185.000", "bedrooms": 3, "bathrooms": "2", "area": 95,
        "city": "Murcia", "address": "Calle Mayor 12", "features": ["terraza", "garaje", "Llamar al 600 123 456"],
        "title": "Piso con terraza y garaje en Murcia",
        "description": "Piso de 3 habitaciones con terraza y garaje. Contacto: 600 123 456.",
    }))
    r = client.post("/api/ai/listing-draft", json={"text": MESSAGE}, headers=auth(make_user()))
    assert r.status_code == 200
    d = r.json()
    assert (d["source"], d["operation"], d["type"], d["price"], d["bedrooms"], d["bathrooms"], d["area"]) == \
        ("ai", "sale", "flat", 185000, 3, 2, 95)
    assert d["features"] == ["terraza", "garaje"]
    assert d["description"] == "Piso de 3 habitaciones con terraza y garaje."
    assert "600" not in json.dumps(d)


def test_without_ai_the_basic_extraction_still_fills_the_form(client, make_user, monkeypatch):
    fake_ai(monkeypatch, TimeoutError("sin respuesta"))
    d = client.post("/api/ai/listing-draft", json={"text": MESSAGE}, headers=auth(make_user())).json()
    assert (d["source"], d["operation"], d["type"], d["price"], d["bedrooms"], d["bathrooms"], d["area"]) == \
        ("basic", "sale", "flat", 185000, 3, 2, 95)
    assert (d["city"], d["address"]) == ("Murcia", "calle Mayor 12")


def test_ai_gaps_are_filled_with_the_basic_extraction(client, make_user, monkeypatch):
    fake_ai(monkeypatch, json.dumps({"type": "flat", "description": "Piso luminoso."}))
    d = client.post("/api/ai/listing-draft", json={"text": MESSAGE}, headers=auth(make_user())).json()
    assert (d["source"], d["price"], d["bedrooms"], d["description"]) == ("ai", 185000, 3, "Piso luminoso.")


def test_rent_and_shorthand_prices():
    assert listing.basic_draft("Alquilo apartamento 2 hab 60m2, 650 euros al mes")["operation"] == "rent"
    assert listing.basic_draft("Alquilo apartamento 2 hab 60m2, 650 euros al mes")["price"] == 650
    assert listing.basic_draft("chalet 250k 4 dormitorios")["price"] == 250000


def test_requires_login_and_counts_towards_ai_limit(client, make_user, monkeypatch):
    assert client.post("/api/ai/listing-draft", json={"text": MESSAGE}).status_code == 401
    monkeypatch.setattr(routers.ai, "check_ai_usage", lambda **_: False)
    assert client.post("/api/ai/listing-draft", json={"text": MESSAGE}, headers=auth(make_user())).status_code == 429
