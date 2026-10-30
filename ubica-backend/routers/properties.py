"""Endpoints públicos: listado y detalle de propiedades y estadísticas de mercado."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, func, select

import models
from database import get_session
from schemas import PublicProperty
from security import get_user_or_none
from services.properties import PUBLIC_STATUSES, can_manage_property, can_view_property

router = APIRouter()

@router.get("/api/properties", response_model=List[PublicProperty])
async def get_properties(skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), session: Session = Depends(get_session)):
    # Orden fijo para que las páginas (skip) no se solapen ni se salten anuncios
    statement = select(models.Property).where(models.Property.status.in_(PUBLIC_STATUSES)).order_by(models.Property.id).offset(skip).limit(limit)
    results = session.exec(statement).all()
    return results

@router.get("/api/properties/{property_id}", response_model=None, responses={200: {"model": PublicProperty}})
async def get_property(property_id: int, current_user: Optional[models.User] = Depends(get_user_or_none), session: Session = Depends(get_session)):
    property_obj = session.get(models.Property, property_id)
    # Los anuncios no publicados solo los ven su propietario, su inmobiliaria y el admin
    if not property_obj or not can_view_property(property_obj, current_user):
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    # Ellos reciben el anuncio completo (datos económicos incluidos); el resto, la vista pública
    if can_manage_property(property_obj, current_user):
        return property_obj
    return PublicProperty.model_validate(property_obj)

@router.get("/api/stats/market")
async def get_market_stats(session: Session = Depends(get_session)):
    # Solo anuncios publicados: los borradores y pendientes no deben dejar rastro en una página pública
    public = models.Property.status.in_(PUBLIC_STATUSES)
    total_properties = session.exec(select(func.count(models.Property.id)).where(public)).one()
    avg_price = session.exec(select(func.avg(models.Property.price)).where(public)).one() or 0
    cities = session.exec(select(models.Property.city).where(public).distinct()).all()
    types = session.exec(select(models.Property.type).where(public).distinct()).all()
    
    return {
        "total_properties": total_properties,
        "average_price": float(avg_price),
        "cities": [c for c in cities if c],
        "property_types": types,
        "market_trend": "+5.2%",
        "last_updated": datetime.now().isoformat()
    }
