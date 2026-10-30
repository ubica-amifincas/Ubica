"""Utilidades de propiedades: conversión desde el formato del frontend, visibilidad por rol y borrado."""
import math
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import delete, update
from sqlmodel import Session, func, or_, select

import models

# Estados que se muestran en el portal público ("available" es el estado antiguo del panel de admin)
PUBLIC_STATUSES = ("for-sale", "for-rent", "reserved", "available")

# Todos los estados que puede tener un anuncio
PROPERTY_STATUSES = ("for-sale", "for-rent", "reserved", "available", "sold", "rented",
                     "under-renovation", "in-use", "pending", "draft", "pending-review", "rejected")

# Anuncios de quien no publica directamente: esperan a que el admin los revise
REVIEW_STATUS = "pending-review"
REJECTED_STATUS = "rejected"
# Lo que el anunciante puede cambiar sin revisión en un anuncio ya publicado
NO_REVIEW_FIELDS = {"status"}

# Tipos en una sola forma (la que usan el filtro y las traducciones del frontend)
PROPERTY_TYPES = ("villa", "apartment", "flat", "house", "penthouse", "townhouse", "studio", "duplex", "chalet", "land")
TYPE_ALIASES = {
    "apartamento": "apartment", "piso": "flat", "casa": "house", "atico": "penthouse", "ático": "penthouse",
    "adosado": "townhouse", "casa adosada": "townhouse", "estudio": "studio", "dúplex": "duplex",
    "terreno": "land", "parcela": "land", "solar": "land",
}


def normalize_property_type(value) -> str:
    """'Apartamento', 'piso', 'Ático'... -> clave común; un tipo desconocido se guarda en minúsculas."""
    key = str(value or "").strip().lower()
    return TYPE_ALIASES.get(key, key)


FLOAT_FIELDS = ("price", "area", "purchasePrice", "totalCost", "monthlyCost", "monthlyIncome")
# Topes razonables: un NaN, un infinito o una cifra absurda rompían las estadísticas públicas (avg -> NaN -> 500)
MAX_NUMBER = {"area": 10_000_000, "bedrooms": 1000, "bathrooms": 1000, "yearBuilt": 3000}
MAX_MONEY = 10_000_000_000
MAX_IMAGES, MAX_FEATURES = 50, 60
INT_FIELDS = ("bedrooms", "bathrooms", "yearBuilt")


def validate_property_payload(prop_data: dict) -> dict:
    """Comprueba tipos y convierte números en texto; un dato mal formado es un 422, no un 500."""
    data = dict(prop_data)
    for field in FLOAT_FIELDS + INT_FIELDS:
        value = data.get(field)
        if value is None or value == "":
            data.pop(field, None)
            continue
        try:
            if isinstance(value, bool):
                raise ValueError
            number = float(value)
            if not math.isfinite(number) or not 0 <= number <= MAX_NUMBER.get(field, MAX_MONEY):
                raise ValueError
            data[field] = int(number) if field in INT_FIELDS else number
        except (TypeError, ValueError, OverflowError):
            raise HTTPException(status_code=422, detail=f"El campo '{field}' debe ser un número válido")
    if "coordinates" in data and not isinstance(data["coordinates"], dict):
        raise HTTPException(status_code=422, detail="'coordinates' debe ser un objeto con lat y lng")
    if "coordinates" in data and (data["coordinates"].get("lat") is not None or data["coordinates"].get("lng") is not None):
        try:
            lat, lng = float(data["coordinates"].get("lat")), float(data["coordinates"].get("lng"))
            if not (math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180):
                raise ValueError
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail="Coordenadas no válidas")
    # Listas de texto: un objeto dentro de "images" rompía el listado público para todos los visitantes
    if "images" in data:
        images = data["images"]
        if not isinstance(images, list) or len(images) > MAX_IMAGES or not all(
                isinstance(i, str) and len(i) <= 1000 and (i.startswith(("https://", "http://", "/"))) for i in images):
            raise HTTPException(status_code=422, detail=f"'images' debe ser una lista de hasta {MAX_IMAGES} direcciones de imagen")
    if "features" in data:
        features = data["features"]
        if not isinstance(features, list) or len(features) > MAX_FEATURES or not all(isinstance(f, str) and len(f) <= 120 for f in features):
            raise HTTPException(status_code=422, detail=f"'features' debe ser una lista de hasta {MAX_FEATURES} textos")
    if "status" in data and data["status"] not in PROPERTY_STATUSES:
        raise HTTPException(status_code=422, detail=f"Estado no válido: {data['status']}")
    if data.get("type"):
        data["type"] = normalize_property_type(data["type"])
    return data


def property_from_payload(prop_data: dict, owner_id: int, default_status: str) -> models.Property:
    prop_data = validate_property_payload(prop_data)
    return models.Property(
        title=prop_data.get('title', ''),
        price=prop_data.get('price', 0),
        type=prop_data.get('type', 'house'),
        status=prop_data.get('status', default_status),
        bedrooms=prop_data.get('bedrooms'),
        bathrooms=prop_data.get('bathrooms'),
        area=prop_data.get('area'),
        latitude=prop_data.get('coordinates', {}).get('lat'),
        longitude=prop_data.get('coordinates', {}).get('lng'),
        address=prop_data.get('address', ''),
        city=prop_data.get('location', ''),
        region="Murcia",
        description=prop_data.get('description', ''),
        images=prop_data.get('images', []),
        features=prop_data.get('features', []),
        year_built=prop_data.get('yearBuilt'),
        energy_rating=prop_data.get('energyRating'),
        orientation=prop_data.get('orientation'),
        purchase_price=prop_data.get('purchasePrice', 0),
        total_cost=prop_data.get('totalCost', 0),
        monthly_cost=prop_data.get('monthlyCost', 0),
        monthly_income=prop_data.get('monthlyIncome', 0),
        owner_id=owner_id
    )


def apply_property_payload(p: models.Property, prop_data: dict) -> None:
    """Actualiza solo los campos presentes en prop_data."""
    prop_data = validate_property_payload(prop_data)
    p.title = prop_data.get('title', p.title)
    p.price = prop_data.get('price', p.price)
    p.type = prop_data.get('type', p.type)
    p.status = prop_data.get('status', p.status)
    p.bedrooms = prop_data.get('bedrooms', p.bedrooms)
    p.bathrooms = prop_data.get('bathrooms', p.bathrooms)
    p.area = prop_data.get('area', p.area)

    coords = prop_data.get('coordinates')
    if coords:
        p.latitude = coords.get('lat', p.latitude)
        p.longitude = coords.get('lng', p.longitude)

    p.address = prop_data.get('address', p.address)
    p.city = prop_data.get('location', p.city)
    p.description = prop_data.get('description', p.description)
    p.images = prop_data.get('images', p.images)
    p.features = prop_data.get('features', p.features)
    p.year_built = prop_data.get('yearBuilt', p.year_built)
    p.energy_rating = prop_data.get('energyRating', p.energy_rating)
    p.orientation = prop_data.get('orientation', p.orientation)
    p.purchase_price = prop_data.get('purchasePrice', p.purchase_price)
    p.total_cost = prop_data.get('totalCost', p.total_cost)
    p.monthly_cost = prop_data.get('monthlyCost', p.monthly_cost)
    p.monthly_income = prop_data.get('monthlyIncome', p.monthly_income)
    p.updated_at = datetime.now()


def month_start(now: Optional[datetime] = None) -> datetime:
    return (now or datetime.now()).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def count_status_this_month(session: Session, status: str, *conditions) -> int:
    """Anuncios con ese estado modificados este mes (al venderse o alquilarse se actualiza updated_at)."""
    statement = select(func.count(models.Property.id)).where(
        models.Property.status == status, models.Property.updated_at >= month_start(), *conditions)
    return session.exec(statement).one()


def get_allowed_properties_statement(user_id: Optional[int], user_role: Optional[str]):
    """
    Returns a SQLModel statement for properties based on the user's role and ID.
    - None (Guest): Only sees 'public/available' properties.
    - Professional roles: See everything for now or specific ones.
    - 'admin': Sees everything.
    """
    if user_role == "admin":
        return select(models.Property)
        
    if user_id is None:
        return select(models.Property).where(models.Property.status.in_(PUBLIC_STATUSES))
        
    # Authenticated user: sees public + their own
    return select(models.Property).where(
        or_(
            models.Property.status.in_(PUBLIC_STATUSES),
            models.Property.owner_id == user_id,
            models.Property.realtor_id == user_id
        )
    )


# Datos que solo ven el propietario, su inmobiliaria y el admin
PRIVATE_PROPERTY_FIELDS = ("purchase_price", "total_cost", "monthly_cost", "monthly_income", "owner_id", "realtor_id")


def publishes_directly(user: Optional[models.User]) -> bool:
    """El admin y las inmobiliarias aprobadas publican sin revisión; el resto pasa por el admin."""
    return user is not None and (user.role == "admin" or (user.role == "realtor" and user.is_approved))


def apply_review(p: models.Property, user: models.User, payload: dict, previous_status: Optional[str]) -> None:
    """
    Decide el estado final de un anuncio que crea o edita su dueño (después de aplicar los cambios).
    Si quien lo hace no publica directamente y el anuncio quedaría visible con contenido nuevo, queda
    "pendiente de revisión" y se guarda el estado que pidió (en venta, en alquiler...) para aplicarlo al aprobarlo.
    """
    requested = p.status
    if requested == REVIEW_STATUS:
        # Reenvía el formulario sin cambiar el estado: se mantiene lo que pidió
        requested = p.pending_status or "for-sale"
    if publishes_directly(user):
        p.status = requested
        p.pending_status = None
        p.review_note = None
        return
    if requested == REJECTED_STATUS:
        # Solo el admin rechaza; si lo reenvía tal cual, vuelve a revisión con lo que había pedido
        requested = p.pending_status or "draft"
    if requested not in PUBLIC_STATUSES:
        # Borrador, vendido, alquilado...: no publica nada, no hace falta revisión
        p.status = requested
        p.pending_status = None
        return
    content_changed = any(key not in NO_REVIEW_FIELDS for key in payload)
    # Un anuncio ya aprobado puede marcarse como reservado (o quedarse igual) sin volver a revisión
    if previous_status in PUBLIC_STATUSES and not content_changed and requested in (previous_status, "reserved"):
        p.status = requested
        return
    p.pending_status = requested
    p.status = REVIEW_STATUS
    p.review_note = None


def can_manage_property(p: models.Property, user: Optional[models.User]) -> bool:
    return user is not None and (user.role == "admin" or user.id in (p.owner_id, p.realtor_id))


def can_view_property(p: models.Property, user: Optional[models.User]) -> bool:
    return p.status in PUBLIC_STATUSES or can_manage_property(p, user)


def assign_realtor(session: Session, p: models.Property, realtor_id: Optional[int]) -> None:
    """Asigna (o quita, con None) la inmobiliaria que gestiona el anuncio. Solo lo usa el panel de admin."""
    if realtor_id is not None:
        realtor = session.get(models.User, realtor_id)
        if realtor is None or realtor.role != "realtor":
            raise HTTPException(status_code=422, detail="realtor_id debe ser un usuario con rol inmobiliaria")
    p.realtor_id = realtor_id


def delete_property(session: Session, p: models.Property) -> None:
    """Borra el anuncio con sus favoritos e inversiones; los mensajes se conservan sin el enlace al anuncio."""
    session.execute(delete(models.Favorite).where(models.Favorite.property_id == p.id))
    session.execute(delete(models.Investment).where(models.Investment.property_id == p.id))
    session.execute(update(models.Message).where(models.Message.property_id == p.id).values(property_id=None))
    session.delete(p)
    session.commit()
