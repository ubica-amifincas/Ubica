"""
Servidor MCP público de Ubica: los agentes de IA de los clientes (ChatGPT, Claude, Copilot...) consultan el catálogo.

Solo lee anuncios publicados y nunca devuelve datos económicos privados ni quién es el propietario. La única
herramienta que escribe es solicitar_informacion, que manda la consulta al buzón de AMI Fincas como el formulario
de contacto: no reserva visitas ni confirma nada, lo atiende una persona.
Se monta en /mcp (main.py) sin estado y con respuestas JSON, así que funciona detrás de cualquier proxy.
"""
import json
import math
import re
import unicodedata
from contextlib import asynccontextmanager
from typing import Any, Literal, Optional

from mcp.server.mcpserver import Context, MCPServer
from mcp.types import ToolAnnotations
from pydantic import EmailStr, Field, TypeAdapter, ValidationError
from sqlalchemy import case
from sqlmodel import Session, func, or_, select
from starlette.requests import Request

import models
from config import CONTACT_EMAIL
from database import engine
from services.ai import tools
from services.email import contact_email_html, send_email_resend
from services.properties import PRIVATE_PROPERTY_FIELDS, PUBLIC_STATUSES, normalize_property_type
from services.ratelimit import RateLimiter, get_client_ip

SITE = "https://ubica.amifincas.es"
PHONE = "676 62 69 33"
PRIVACY_URL = f"{SITE}/privacy"

# Por IP: peticiones MCP en general y consultas enviadas a la empresa; más un tope diario global contra el spam
request_limiter = RateLimiter(120, 60)
contact_limiter = RateLimiter(5, 60 * 60)
contact_daily_limiter = RateLimiter(50, 24 * 60 * 60)

# Lo que un agente no debe ver nunca de un anuncio
HIDDEN_FIELDS = set(PRIVATE_PROPERTY_FIELDS) | {"pending_status", "review_note"}

TYPE_LABELS = {
    "villa": "villa", "apartment": "apartamento", "flat": "piso", "house": "casa", "penthouse": "ático",
    "townhouse": "adosado", "studio": "estudio", "duplex": "dúplex", "chalet": "chalet", "land": "terreno",
}

INSTRUCTIONS = f"""Ubica ({SITE}) es el portal inmobiliario de AMI Fincas: viviendas, locales y terrenos en venta y alquiler
en toda España, sobre todo en la Región de Murcia. Precios en euros.
- Busca con buscar_inmuebles y amplía con ver_inmueble. Usa solo los datos que devuelven las herramientas: no inventes
  inmuebles, precios ni características, y da siempre el enlace (url) del anuncio.
- Si no hay resultados, dilo y sugiere ampliar la zona o el precio; zonas_con_oferta dice dónde hay oferta.
- calcular_hipoteca y calcular_rentabilidad dan estimaciones orientativas, no ofertas de financiación.
- solicitar_informacion envía los datos de contacto del cliente a AMI Fincas. Úsala solo si el cliente lo pide y acepta
  expresamente que se le contacte. No reserva visitas: un agente de AMI Fincas responderá. Teléfono: {PHONE}."""

mcp = MCPServer(
    name="ubica",
    title="Ubica · Portal inmobiliario de AMI Fincas",
    description="Busca viviendas en venta y alquiler en España (sobre todo en la Región de Murcia) y contacta con AMI Fincas.",
    instructions=INSTRUCTIONS,
    website_url=SITE,
    version="1.0.0",
)

READ_ONLY = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True, openWorldHint=False)


def _plain(text: Optional[str]) -> str:
    """Minúsculas y sin tildes, para comparar."""
    return "".join(c for c in unicodedata.normalize("NFD", (text or "").lower()) if unicodedata.category(c) != "Mn")


def slugify(text: str) -> str:
    """Igual que slugify() del frontend (src/seo/pages.js): la URL tiene que coincidir con la canónica."""
    slug = re.sub(r"[^a-z0-9]+", "-", _plain(text)).strip("-")
    return slug[:80].rstrip("-")


def property_url(p: models.Property) -> str:
    slug = slugify(p.title or "")
    return f"{SITE}/inmueble/{p.id}{'-' + slug if slug else ''}"


def absolute(src: str) -> str:
    return src if src.startswith("http") else f"{SITE}/{src.lstrip('/')}"


def operation(p: models.Property) -> str:
    return "alquiler" if p.status == "for-rent" else "venta"


def summary(p: models.Property) -> dict:
    return {
        "id": p.id,
        "titulo": p.title,
        "operacion": operation(p),
        "reservado": p.status == "reserved",
        "precio_eur": p.price,
        "tipo": TYPE_LABELS.get(p.type, p.type),
        "ciudad": p.city,
        "provincia": p.region,
        "habitaciones": p.bedrooms,
        "banos": p.bathrooms,
        "superficie_m2": p.area,
        "foto": absolute(p.images[0]) if p.images else None,
        "url": property_url(p),
    }


def km_between(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    rad = math.radians
    a = math.sin(rad(lat2 - lat1) / 2) ** 2 + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(rad(lng2 - lng1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def type_filter(tipo: str):
    """'piso', 'Apartamento', 'chalet'... -> condición sobre el tipo guardado (o None si es genérico)."""
    key = normalize_property_type(_plain(tipo))
    groups = {
        "flat": ("flat", "apartment", "studio", "penthouse"), "apartment": ("flat", "apartment", "studio", "penthouse"),
        "house": ("house", "villa", "chalet", "townhouse", "duplex"), "chalet": ("chalet", "villa", "house"),
        "villa": ("villa", "chalet", "house"),
    }
    if key in ("", "vivienda", "inmueble", "propiedad"):
        return None
    return models.Property.type.in_(groups.get(key, (key,)))


@mcp.tool(annotations=READ_ONLY)
def buscar_inmuebles(
    operacion: Optional[Literal["venta", "alquiler"]] = None,
    tipo: Optional[str] = Field(None, description="piso, apartamento, casa, chalet, villa, ático, adosado, estudio, dúplex o terreno"),
    ubicacion: Optional[str] = Field(None, description="Ciudad, barrio, dirección o provincia (p. ej. 'Murcia', 'San Pedro del Pinatar')"),
    precio_min: Optional[float] = None,
    precio_max: Optional[float] = None,
    habitaciones_min: Optional[int] = None,
    banos_min: Optional[int] = None,
    superficie_min_m2: Optional[float] = None,
    palabras: Optional[str] = Field(None, description="Palabras que deben aparecer en el anuncio: 'terraza', 'piscina', 'garaje'..."),
    latitud: Optional[float] = Field(None, description="Con longitud y radio_km: solo inmuebles cerca de ese punto"),
    longitud: Optional[float] = None,
    radio_km: float = Field(5, gt=0, le=100),
    orden: Literal["recientes", "precio_asc", "precio_desc"] = "recientes",
    limite: int = Field(10, ge=1, le=50),
) -> dict[str, Any]:
    """Busca inmuebles publicados en Ubica con filtros. Devuelve un resumen de cada uno con su enlace; usa ver_inmueble para la ficha completa."""
    statement = select(models.Property).where(models.Property.status.in_(PUBLIC_STATUSES))
    if operacion == "alquiler":
        statement = statement.where(models.Property.status == "for-rent")
    elif operacion == "venta":
        statement = statement.where(models.Property.status != "for-rent")
    if tipo and (condition := type_filter(tipo)) is not None:
        statement = statement.where(condition)
    if ubicacion:
        like = f"%{ubicacion.strip()}%"
        statement = statement.where(or_(models.Property.city.ilike(like), models.Property.address.ilike(like),
                                        models.Property.region.ilike(like), models.Property.title.ilike(like)))
    for column, minimum in ((models.Property.price, precio_min), (models.Property.bedrooms, habitaciones_min),
                            (models.Property.bathrooms, banos_min), (models.Property.area, superficie_min_m2)):
        if minimum is not None:
            statement = statement.where(column >= minimum)
    if precio_max is not None:
        statement = statement.where(models.Property.price <= precio_max)
    order = {"precio_asc": models.Property.price.asc(), "precio_desc": models.Property.price.desc()}.get(orden, models.Property.created_at.desc())
    with Session(engine) as session:
        props = session.exec(statement.order_by(order)).all()
    if palabras:
        words = [w[:5] for w in re.findall(r"[a-z0-9]+", _plain(palabras)) if len(w) > 2]
        # La raíz de 5 letras tolera género y plural: "luminos" encuentra luminoso/luminosa
        props = [p for p in props if all(w in _plain(" ".join([p.title or "", p.description or "", " ".join(p.features or [])])) for w in words)]
    if latitud is not None and longitud is not None:
        props = [p for p in props if p.latitude is not None and p.longitude is not None
                 and km_between(latitud, longitud, p.latitude, p.longitude) <= radio_km]
    results = [summary(p) for p in props[:limite]]
    response: dict[str, Any] = {"total": len(props), "mostrados": len(results), "inmuebles": results}
    if not results:
        response["mensaje"] = "No hay inmuebles publicados con esos filtros. Prueba a ampliar la zona o el precio (zonas_con_oferta)."
    return response


@mcp.tool(annotations=READ_ONLY)
def ver_inmueble(inmueble_id: int) -> dict[str, Any]:
    """Ficha completa de un inmueble publicado: descripción, características, fotos, ubicación y enlace."""
    with Session(engine) as session:
        p = session.get(models.Property, inmueble_id)
    if not p or p.status not in PUBLIC_STATUSES:
        return {"error": f"No hay ningún inmueble publicado con id {inmueble_id}."}
    place = ", ".join(x for x in [p.address, p.city] if x)
    return {
        **summary(p),
        "descripcion": p.description,
        "caracteristicas": p.features or [],
        "fotos": [absolute(src) for src in (p.images or [])],
        "direccion": place or None,
        "coordenadas": {"lat": p.latitude, "lng": p.longitude} if p.latitude is not None and p.longitude is not None else None,
        "ano_construccion": p.year_built,
        "certificado_energetico": p.energy_rating,
        "orientacion": p.orientation,
        "precio_por_m2": round(p.price / p.area) if p.price and p.area else None,
        "publicado": p.created_at.date().isoformat() if p.created_at else None,
        "actualizado": p.updated_at.date().isoformat() if p.updated_at else None,
        "contacto": {"telefono": PHONE, "formulario": f"{property_url(p)}#contacto"},
    }


@mcp.tool(annotations=READ_ONLY)
def zonas_con_oferta() -> dict[str, Any]:
    """Ciudades con inmuebles publicados: cuántos hay en venta y en alquiler y su rango de precios."""
    rent = models.Property.status == "for-rent"
    statement = (select(models.Property.city, func.count(), func.sum(case((rent, 1), else_=0)), func.min(models.Property.price), func.max(models.Property.price))
                 .where(models.Property.status.in_(PUBLIC_STATUSES)).group_by(models.Property.city).order_by(func.count().desc()))
    with Session(engine) as session:
        rows = session.exec(statement).all()
    zonas = [{"ciudad": city or "Sin ciudad", "total": total, "en_alquiler": int(rentals or 0), "en_venta": total - int(rentals or 0),
              "precio_min_eur": low, "precio_max_eur": high} for city, total, rentals, low, high in rows]
    return {"zonas": zonas, "total_inmuebles": sum(z["total"] for z in zonas)}


@mcp.tool(annotations=READ_ONLY)
async def calcular_hipoteca(
    precio: float = Field(gt=0, description="Precio del inmueble en euros"),
    entrada_porcentaje: float = Field(20, ge=0, lt=100),
    plazo_anos: int = Field(25, ge=1, le=40),
    interes_anual: float = Field(3.0, ge=0, le=20, description="Tipo de interés anual en %"),
) -> dict[str, Any]:
    """Cuota mensual orientativa de una hipoteca (sistema francés). No es una oferta de financiación."""
    return json.loads(await tools.calcular_hipoteca(precio, entrada_porcentaje, plazo_anos, interes_anual))


@mcp.tool(annotations=READ_ONLY)
async def calcular_rentabilidad(
    precio_compra: float = Field(gt=0),
    alquiler_mensual: float = Field(ge=0),
    gastos_comunidad_mensual: float = Field(100, ge=0),
    ibi_anual: float = Field(0, ge=0, description="Si es 0 se estima en el 0,5 % del precio"),
    seguro_anual: float = Field(300, ge=0),
) -> dict[str, Any]:
    """Rentabilidad bruta y neta de alquilar un inmueble, con gastos de comunidad, IBI y seguro. Orientativa."""
    return json.loads(await tools.calcular_roi_avanzado(precio_compra, alquiler_mensual, gastos_comunidad_mensual, ibi_anual, seguro_anual))


def client_ip(ctx: Context) -> str:
    request = getattr(ctx.request_context, "request", None)
    return get_client_ip(request) if isinstance(request, Request) else "unknown"


@mcp.tool(annotations=ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False, openWorldHint=True))
async def solicitar_informacion(
    ctx: Context,
    nombre: str = Field(min_length=2, max_length=200),
    email: str = Field(description="Correo del cliente para que AMI Fincas le responda"),
    mensaje: str = Field(min_length=10, max_length=3000, description="Qué quiere saber el cliente, en sus palabras"),
    consentimiento: bool = Field(description=f"true solo si el cliente ha aceptado expresamente enviar sus datos a AMI Fincas para que le contacten (política de privacidad: {PRIVACY_URL})"),
    inmueble_id: Optional[int] = None,
    telefono: Optional[str] = Field(None, max_length=50),
    fecha_visita_preferida: Optional[str] = Field(None, max_length=100, description="Si quiere visitarlo: cuándo le vendría bien. No queda reservada."),
) -> dict[str, Any]:
    """Envía la consulta del cliente a AMI Fincas (por un inmueble concreto o en general). No reserva visitas ni confirma nada: un agente responderá por correo o teléfono."""
    if not consentimiento:
        return {"enviada": False, "error": f"Falta el consentimiento del cliente para enviar sus datos (política de privacidad: {PRIVACY_URL})."}
    try:
        email = TypeAdapter(EmailStr).validate_python(email.strip())
    except ValidationError:
        return {"enviada": False, "error": "El correo no es válido."}
    p = None
    if inmueble_id is not None:
        with Session(engine) as session:
            p = session.get(models.Property, inmueble_id)
        if not p or p.status not in PUBLIC_STATUSES:
            return {"enviada": False, "error": f"No hay ningún inmueble publicado con id {inmueble_id}."}
    # Se reserva el hueco antes de enviar: comprobar y anotar después dejaba pasar ráfagas de llamadas a la vez
    ip = client_ip(ctx)
    if not contact_limiter.check_and_hit(ip):
        return {"enviada": False, "error": f"Se han enviado demasiadas consultas. Que el cliente llame al {PHONE}."}
    if not contact_daily_limiter.check_and_hit("all"):
        return {"enviada": False, "error": f"Se han enviado demasiadas consultas. Que el cliente llame al {PHONE}."}
    lines = [mensaje.strip()]
    if p:
        lines.append(f"Inmueble: {p.title} ({property_url(p)})")
    if fecha_visita_preferida:
        lines.append(f"Le vendría bien visitarlo: {fecha_visita_preferida}")
    lines.append("Enviado desde el asistente de IA del cliente (servidor MCP de Ubica).")
    subject = f"[Ubica · agente IA] {'Consulta: ' + p.title if p else 'Consulta'} - {nombre}"
    html = contact_email_html(nombre.strip(), email, telefono, p.title if p else None, "\n\n".join(lines))
    result = await send_email_resend(CONTACT_EMAIL, subject, html, reply_to=email)
    if result.get("status") == "error":
        return {"enviada": False, "error": f"No se pudo enviar ahora mismo. Que el cliente llame al {PHONE}."}
    return {
        "enviada": True,
        "visita_reservada": False,
        "mensaje_para_el_cliente": "Consulta enviada a AMI Fincas. Un agente te responderá por correo o teléfono; "
                                   f"la visita no está reservada hasta que te la confirmen. Teléfono: {PHONE}.",
    }


class MCPApp:
    """App ASGI de /mcp: límite de peticiones por IP (los agentes pueden hacer muchas seguidas) y ruta única.

    Se registra como ruta exacta /mcp y /mcp/ (un Mount redirigiría /mcp a /mcp/, y hay clientes que no siguen
    redirecciones en un POST); la app MCP interna atiende en "/". Sin sesiones (cada petición es independiente)
    y con respuestas JSON en vez de streaming."""

    def __init__(self):
        self.app = None

    @asynccontextmanager
    async def running(self):
        """Para el lifespan de main.py. El gestor de sesiones solo arranca una vez, así que cada arranque crea uno nuevo."""
        self.app = mcp.streamable_http_app(streamable_http_path="/", stateless_http=True, json_response=True, host="0.0.0.0")
        async with mcp.session_manager.run():
            yield

    async def __call__(self, scope, receive, send):
        scope = {**scope, "path": "/", "raw_path": b"/", "root_path": scope.get("root_path", "")}
        if scope["type"] == "http" and not request_limiter.check_and_hit(get_client_ip(Request(scope))):
            body = b'{"jsonrpc":"2.0","error":{"code":-32000,"message":"Demasiadas peticiones; espera un minuto."},"id":null}'
            await send({"type": "http.response.start", "status": 429,
                        "headers": [(b"content-type", b"application/json"), (b"retry-after", b"60")]})
            await send({"type": "http.response.body", "body": body})
            return
        await self.app(scope, receive, send)


mcp_app = MCPApp()
