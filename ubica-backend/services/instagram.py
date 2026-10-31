"""Publicar el vídeo vertical de un inmueble como Reel en Instagram (@amifincas), con la API oficial de Meta.

El vídeo lo genera cada hora .github/workflows/property-videos.yml y queda en un bucket público de Supabase; aquí
solo se le pasa su URL a Instagram, que lo descarga, lo procesa (de segundos a un par de minutos) y se publica.
"""
import asyncio
import re
import unicodedata
from datetime import datetime
from typing import Optional

import aiohttp
from sqlmodel import Session

import config
import models
from database import engine

PHONE = "676 62 69 33"
SITE = "ubica.amifincas.es"
# Lo que se compara con el índice de vídeos para saber si el vídeo corresponde aún al anuncio
VIDEO_PHOTOS = 10
# Espera a que Instagram procese el vídeo: hasta 5 minutos
POLL_SECONDS = 5
POLL_TRIES = 60
CAPTION_MAX = 2200
HASHTAGS_MAX = 30

TYPE_NAMES = {
    "villa": "Villa", "apartment": "Apartamento", "flat": "Piso", "house": "Casa", "penthouse": "Ático",
    "townhouse": "Adosado", "studio": "Estudio", "duplex": "Dúplex", "chalet": "Chalet", "land": "Terreno",
    "commercial": "Local comercial",
}
OPERATIONS = {"for-sale": "en venta", "for-rent": "en alquiler", "reserved": "reservado", "available": "disponible"}
OPERATION_TAGS = {"for-sale": ["InmueblesEnVenta", "CasasEnVenta"], "for-rent": ["Alquiler", "PisosEnAlquiler"]}
MAR_MENOR = {"san pedro del pinatar", "san javier", "los alcazares", "la manga", "lo pagan", "santiago de la ribera",
             "torre pacheco", "los nietos", "mar de cristal", "playa honda"}
COSTA_BLANCA = {"torrevieja", "orihuela", "orihuela costa", "pilar de la horadada", "guardamar del segura", "alicante",
                "santa pola", "elche", "benidorm"}


class InstagramError(Exception):
    pass


def configured() -> bool:
    return bool(config.INSTAGRAM_ACCESS_TOKEN and config.INSTAGRAM_USER_ID)


def _plain(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower().strip()


def hashtag(text: str) -> str:
    """«San Pedro del Pinatar» -> «SanPedroDelPinatar» (sin tildes: así es como se buscan)."""
    words = re.split(r"[^0-9a-z]+", _plain(text))
    return "".join(w.capitalize() for w in words if w)


def euros(value: float) -> str:
    return f"{round(value):,}".replace(",", ".") + " €"


def build_caption(p: models.Property) -> str:
    """Texto del Reel a partir de los datos del anuncio (el equipo lo revisa antes de publicar)."""
    kind = TYPE_NAMES.get((p.type or "").lower(), (p.type or "Inmueble").capitalize())
    parts = [p.address] if p.address else []
    if p.city and (not p.address or p.city.lower() not in p.address.lower()):
        parts.append(p.city)
    place = ", ".join(parts)
    lines = [f"🏡 {kind} {OPERATIONS.get(p.status, '')} en {place}".replace("  ", " ") if place else f"🏡 {kind}"]
    if p.price:
        lines.append(f"💶 {euros(p.price)}{'/mes' if p.status == 'for-rent' else ''}")
    facts = []
    if p.bedrooms:
        facts.append(f"🛏️ {p.bedrooms} " + ("habitación" if p.bedrooms == 1 else "habitaciones"))
    if p.bathrooms:
        facts.append(f"🛁 {p.bathrooms} baño" + ("s" if p.bathrooms != 1 else ""))
    if p.area:
        facts.append(f"📐 {round(p.area)} m²")
    if facts:
        lines.append(" · ".join(facts))
    features = [f.strip().capitalize() for f in (p.features or []) if isinstance(f, str) and f.strip()][:5]
    if features:
        lines.append("✨ " + " · ".join(features))

    text = "\n".join(lines)
    description = re.sub(r"\s+", " ", p.description or "").strip()
    if description:
        if len(description) > 400:  # se corta en el último punto antes de 400 caracteres
            cut = description[:400]
            description = cut[: cut.rfind(". ") + 1] if ". " in cut else cut.rsplit(" ", 1)[0] + "…"
        text += "\n\n" + description
    text += f"\n\n📲 Más fotos y detalles en {SITE} (enlace en la bio) · Ref. {p.id}\n📞 {PHONE} · WhatsApp"

    city = _plain(p.city or "")
    tags = [hashtag(p.city)] if p.city else []
    if city in MAR_MENOR:
        tags += ["MarMenor", "RegionDeMurcia"]
    elif city in COSTA_BLANCA:
        tags += ["CostaBlanca", "Alicante"]
    elif p.region:
        tags.append(hashtag(p.region))
    tags += [hashtag(kind), *OPERATION_TAGS.get(p.status, []), "Inmobiliaria", "UbicaByAMIFincas", "AMIFincas"]
    unique = list(dict.fromkeys(t for t in tags if t))
    return text + "\n\n" + " ".join(f"#{t}" for t in unique)


# ---------- vídeo ----------

async def video_entry(property_id: int) -> Optional[dict]:
    """Datos del vídeo del inmueble en el índice público, o None si aún no tiene."""
    try:
        timeout = aiohttp.ClientTimeout(total=15)
        async with aiohttp.ClientSession(timeout=timeout) as http:
            async with http.get(config.PROPERTY_VIDEOS_INDEX_URL) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json(content_type=None)
    except (aiohttp.ClientError, asyncio.TimeoutError, ValueError):
        return None
    return (data.get("videos") or {}).get(str(property_id))


def video_status(p: models.Property, entry: Optional[dict]) -> str:
    """ready: el vídeo corresponde al anuncio. outdated: han cambiado las fotos o el precio y se está rehaciendo."""
    if not entry or not entry.get("vertical"):
        return "missing"
    if entry.get("images") != (p.images or [])[:VIDEO_PHOTOS] or entry.get("price") != p.price:
        return "outdated"
    return "ready"


# ---------- Graph API ----------

async def _graph(http: aiohttp.ClientSession, method: str, path: str, **params) -> dict:
    params["access_token"] = config.INSTAGRAM_ACCESS_TOKEN
    url = f"{config.INSTAGRAM_GRAPH_URL}/{path}"
    request = http.post(url, data=params) if method == "POST" else http.get(url, params=params)
    async with request as resp:
        data = await resp.json(content_type=None)
    if resp.status >= 400 or "error" in data:
        error = data.get("error") or {}
        raise InstagramError(error.get("error_user_msg") or error.get("message") or f"Error {resp.status} de Instagram")
    return data


async def publish_reel(video_url: str, caption: str) -> tuple[str, Optional[str]]:
    """Crea el Reel, espera a que Instagram procese el vídeo y lo publica. Devuelve (id, enlace)."""
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as http:
        container = await _graph(http, "POST", f"{config.INSTAGRAM_USER_ID}/media", media_type="REELS",
                                 video_url=video_url, caption=caption, share_to_feed="true")
        for _ in range(POLL_TRIES):
            await asyncio.sleep(POLL_SECONDS)
            state = await _graph(http, "GET", container["id"], fields="status_code,status")
            code = state.get("status_code")
            if code == "FINISHED":
                break
            if code in ("ERROR", "EXPIRED"):
                raise InstagramError(f"Instagram no ha aceptado el vídeo ({state.get('status') or code})")
        else:
            raise InstagramError("Instagram está tardando demasiado en procesar el vídeo")
        media = await _graph(http, "POST", f"{config.INSTAGRAM_USER_ID}/media_publish", creation_id=container["id"])
        info = await _graph(http, "GET", media["id"], fields="permalink")
        return media["id"], info.get("permalink")


async def publish_post(post_id: int) -> None:
    """Tarea en segundo plano: publica y deja el resultado en la fila de SocialPost."""
    with Session(engine) as session:
        post = session.get(models.SocialPost, post_id)
        if not post or post.status != "publishing":
            return
        video_url, caption = post.video_url, post.caption
    try:
        media_id, permalink = await publish_reel(video_url, caption)
        result = {"status": "published", "media_id": media_id, "permalink": permalink, "published_at": datetime.now()}
    except Exception as e:  # cualquier fallo queda guardado para verlo en la ficha
        print(f"[Instagram] Error publicando el post {post_id}: {e}")
        result = {"status": "error", "error": str(e)[:500] or "Error desconocido"}
    with Session(engine) as session:
        post = session.get(models.SocialPost, post_id)
        for key, value in result.items():
            setattr(post, key, value)
        session.add(post)
        session.commit()
