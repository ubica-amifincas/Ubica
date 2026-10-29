"""Utilidades de propiedades: conversión desde el formato del frontend y filtro de visibilidad por rol."""
from datetime import datetime
from typing import Optional

from sqlmodel import or_, select

import models


def property_from_payload(prop_data: dict, owner_id: int, default_status: str) -> models.Property:
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
        
    # Public statuses
    public_statuses = ["available", "for-sale", "for-rent"]
    
    if user_id is None:
        return select(models.Property).where(models.Property.status.in_(public_statuses))
        
    # Authenticated user: sees public + their own
    return select(models.Property).where(
        or_(
            models.Property.status.in_(public_statuses),
            models.Property.owner_id == user_id,
            models.Property.realtor_id == user_id
        )
    )
