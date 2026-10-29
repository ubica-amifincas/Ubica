"""Utilidades de propiedades: conversión desde el formato del frontend, visibilidad por rol y borrado."""
from datetime import datetime
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import delete, update
from sqlmodel import Session, or_, select

import models

# Estados que se muestran en el portal público ("available" es el estado antiguo del panel de admin)
PUBLIC_STATUSES = ("for-sale", "for-rent", "reserved", "available")

FLOAT_FIELDS = ("price", "area", "purchasePrice", "totalCost", "monthlyCost", "monthlyIncome")
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
            data[field] = int(float(value)) if field in INT_FIELDS else float(value)
        except (TypeError, ValueError):
            raise HTTPException(status_code=422, detail=f"El campo '{field}' debe ser un número")
    if "coordinates" in data and not isinstance(data["coordinates"], dict):
        raise HTTPException(status_code=422, detail="'coordinates' debe ser un objeto con lat y lng")
    if "images" in data and not isinstance(data["images"], list):
        raise HTTPException(status_code=422, detail="'images' debe ser una lista")
    return data


def property_from_payload(prop_data: dict, owner_id: int, default_status: str) -> models.Property:
    prop_data = validate_property_payload(prop_data)
    return models.Property(
        title=prop_data.get('title', ''),
        price=prop_data.get('price', 0),
        type=prop_data.get('type', 'Casa'),
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


def can_view_property(p: models.Property, user: Optional[models.User]) -> bool:
    if p.status in PUBLIC_STATUSES:
        return True
    return user is not None and (user.role == "admin" or user.id in (p.owner_id, p.realtor_id))


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
