"""Endpoints públicos: listado y detalle de propiedades y estadísticas de mercado."""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, func, select

import models
from database import get_session

router = APIRouter()

@router.get("/api/properties", response_model=List[models.Property])
async def get_properties(skip: int = 0, limit: int = 20, session: Session = Depends(get_session)):
    # Solo mostrar propiedades en venta, alquiler o reservadas en el listado público
    public_statuses = ['for-sale', 'for-rent', 'reserved']
    statement = select(models.Property).where(models.Property.status.in_(public_statuses)).offset(skip).limit(limit)
    results = session.exec(statement).all()
    return results

@router.get("/api/properties/{property_id}", response_model=models.Property)
async def get_property(property_id: int, session: Session = Depends(get_session)):
    property_obj = session.get(models.Property, property_id)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return property_obj

@router.get("/api/stats/market")
async def get_market_stats(session: Session = Depends(get_session)):
    total_properties = session.exec(select(func.count(models.Property.id))).one()
    avg_price = session.exec(select(func.avg(models.Property.price))).one() or 0
    cities = session.exec(select(models.Property.city).distinct()).all()
    types = session.exec(select(models.Property.type).distinct()).all()
    
    return {
        "total_properties": total_properties,
        "average_price": float(avg_price),
        "cities": [c for c in cities if c],
        "property_types": types,
        "market_trend": "+5.2%",
        "last_updated": datetime.now().isoformat()
    }
