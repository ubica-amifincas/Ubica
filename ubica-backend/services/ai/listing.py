"""Borrador de anuncio a partir del mensaje que manda el vendedor (normalmente por WhatsApp)."""
import json
import re
from typing import Optional

from services.ai.chat import OPENAI_AVAILABLE, PROVIDERS, PROVIDER_TIMEOUT_SECONDS
from services.properties import PROPERTY_TYPES, normalize_property_type

MAX_TEXT_LENGTH = 4000

SYSTEM_PROMPT = """Eres el asistente de una inmobiliaria de Murcia. Te pasan el mensaje que un propietario ha enviado
por WhatsApp con los datos de su inmueble. Devuelve SOLO un objeto JSON con estas claves:
- "operation": "sale" (venta) o "rent" (alquiler); null si no se sabe
- "type": uno de flat, apartment, house, townhouse, villa, chalet, penthouse, duplex, studio, land; null si no se sabe
- "price": número en euros (alquiler: euros al mes); null si no aparece
- "bedrooms", "bathrooms": enteros o null
- "area": metros cuadrados construidos o útiles (número) o null
- "city": municipio o null; "address": calle y número o null
- "features": lista corta de extras que aparezcan (piscina, garaje, terraza, ascensor, trastero, aire acondicionado...)
- "title": título de anuncio de menos de 80 caracteres
- "description": descripción de anuncio en español, 2-4 frases, profesional y cercana
Reglas: usa solo datos que estén en el mensaje; no inventes nada (ni vistas, ni reformas, ni cercanías).
No incluyas teléfonos, correos ni nombres de personas en ningún campo."""

# Teléfonos y correos del vendedor no deben acabar en el anuncio público
PHONE = re.compile(r"(?:\+?34[\s.-]?)?(?:\d[\s.-]?){9}")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")


def _scrub(text: Optional[str]) -> Optional[str]:
    """Quita las frases con un teléfono o un correo (quitar solo el dato dejaría frases como "Llama al ")."""
    if not text:
        return None
    sentences = re.split(r"(?<=[.!?\n])\s+", text)
    kept = [s for s in sentences if not (PHONE.search(s) or EMAIL.search(s))]
    return " ".join(kept).strip() or None


def _number(value) -> Optional[float]:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value) if value >= 0 else None
    digits = re.sub(r"[^\d,.]", "", str(value))
    # "185.000" y "185,000" son miles; "85,5" son decimales
    digits = re.sub(r"[.,](?=\d{3}(?:\D|$))", "", digits).replace(",", ".")
    try:
        return float(digits)
    except ValueError:
        return None


def _int(value) -> Optional[int]:
    n = _number(value)
    return int(n) if n is not None and n < 100 else None


def _text(value, limit: int) -> Optional[str]:
    cleaned = _scrub(value) if isinstance(value, str) else None
    return cleaned[:limit] if cleaned else None


def clean_draft(raw: dict) -> dict:
    """Normaliza lo que devuelve el modelo: tipos de datos, valores permitidos y nada de datos de contacto."""
    operation = raw.get("operation") if raw.get("operation") in ("sale", "rent") else None
    prop_type = normalize_property_type(raw.get("type")) if raw.get("type") else None
    features = [f for f in (_text(f, 40) for f in (raw.get("features") or []) if isinstance(f, str)) if f][:12]
    return {
        "operation": operation,
        "type": prop_type if prop_type in PROPERTY_TYPES else None,
        "price": _number(raw.get("price")),
        "bedrooms": _int(raw.get("bedrooms")),
        "bathrooms": _int(raw.get("bathrooms")),
        "area": _number(raw.get("area")),
        "city": _text(raw.get("city"), 80),
        "address": _text(raw.get("address"), 150),
        "features": features,
        "title": _text(raw.get("title"), 120),
        "description": _text(raw.get("description"), 2000),
    }


TYPE_WORDS = [("atico", "penthouse"), ("ático", "penthouse"), ("duplex", "duplex"), ("dúplex", "duplex"), ("chalet", "chalet"),
              ("villa", "villa"), ("adosad", "townhouse"), ("estudio", "studio"), ("apartamento", "apartment"),
              ("piso", "flat"), ("terreno", "land"), ("parcela", "land"), ("solar", "land"), ("casa", "house")]


def basic_draft(text: str) -> dict:
    """Sin IA: saca lo más habitual con expresiones regulares (precio, habitaciones, baños, m², tipo, operación)."""
    low = text.lower()

    def grab(pattern):
        m = re.search(pattern, low)
        return m.group(1) if m else None

    price = _number(grab(r"(\d[\d.,]*)\s*(?:€|eur\b|euros)") or grab(r"precio\s*:?\s*(\d[\d.,]*)"))
    thousands = _number(grab(r"(\d[\d.,]*)\s*k\b"))  # "185k"
    if price is None and thousands is not None:
        price = thousands * 1000
    prop_type = next((t for word, t in TYPE_WORDS if word in low), None)
    operation = "rent" if re.search(r"alquil|alquiler|al mes|/mes", low) else ("sale" if re.search(r"vend|venta", low) else None)
    # Municipio: "en Molina de Segura", "en San Pedro del Pinatar" (con mayúscula, sobre el texto original)
    city = re.search(r"\ben ((?:[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)(?: (?:de|del|la|las|los|el)? ?[A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)*)", text)
    address = re.search(r"((?:calle|c/|avenida|avda\.?|plaza|pza\.?|paseo|camino|carretera|ctra\.?)\s+[^,\n]+?\s*(?:n[ºo°.]\s*)?\d+[a-zA-Z]?)\b",
                        text, re.IGNORECASE)
    return clean_draft({
        "operation": operation,
        "type": prop_type,
        "city": city.group(1) if city else None,
        "address": address.group(1) if address else None,
        "price": price,
        "bedrooms": grab(r"(\d+)\s*(?:hab|dorm|habitaci)"),
        "bathrooms": grab(r"(\d+)\s*(?:baño|bano|aseo)"),
        "area": grab(r"(\d[\d.,]*)\s*(?:m2|m²|metros)"),
    })


def _parse_json(content: str) -> dict:
    match = re.search(r"\{.*\}", content or "", re.S)
    if not match:
        raise ValueError("La respuesta no contiene JSON")
    data = json.loads(match.group(0))
    if not isinstance(data, dict):
        raise ValueError("La respuesta no es un objeto JSON")
    return data


async def draft_from_message(text: str) -> dict:
    """Prueba los proveedores en orden; si ninguno responde, devuelve lo que sacan las expresiones regulares."""
    text = text.strip()[:MAX_TEXT_LENGTH]
    if OPENAI_AVAILABLE:
        import openai
        for name, api_key, base_url, model in PROVIDERS:
            if not api_key:
                continue
            try:
                client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=PROVIDER_TIMEOUT_SECONDS, max_retries=1)
                response = await client.chat.completions.create(
                    model=model,
                    messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": text}],
                    temperature=0.2,
                    max_tokens=1200,
                )
                draft = clean_draft(_parse_json(response.choices[0].message.content))
                # Lo que la IA no haya visto pero esté claro en el texto se completa con la extracción básica
                basic = basic_draft(text)
                for key, value in basic.items():
                    if draft.get(key) in (None, []) and value not in (None, []):
                        draft[key] = value
                return {**draft, "source": "ai"}
            except Exception as e:  # noqa: BLE001 - se prueba el siguiente proveedor
                print(f"[IA] borrador de anuncio con {name} falló: {type(e).__name__}: {str(e)[:200]}")
    return {**basic_draft(text), "source": "basic"}
