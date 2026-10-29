"""Panel de inmobiliaria (rol realtor)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, or_, select

import models
from database import get_session
from security import require_role
from services.properties import count_status_this_month

router = APIRouter()

@router.get("/api/realtor/dashboard")
async def get_realtor_dashboard(current_user: models.User = Depends(require_role(["realtor"])), session: Session = Depends(get_session)):
    # Cartera: anuncios propios y los que el admin le ha asignado
    mine = or_(models.Property.owner_id == current_user.id, models.Property.realtor_id == current_user.id)
    my_properties = session.exec(select(models.Property).where(mine)).all()
    sold = [p for p in my_properties if p.status == "sold"]
    return {
        "total_properties": len(my_properties),
        "properties_sold": len(sold),
        "properties_rented": sum(1 for p in my_properties if p.status == "rented"),
        "this_month_sales": count_status_this_month(session, "sold", mine),
        "this_month_rentals": count_status_this_month(session, "rented", mine),
        "avg_sale_price": float(sum(p.price for p in sold) / len(sold)) if sold else 0.0,
    }

@router.get("/api/realtor/properties", response_model=List[models.Property])
async def get_realtor_properties(current_user: models.User = Depends(require_role(["realtor"])), session: Session = Depends(get_session)):
    return session.exec(select(models.Property).where(models.Property.realtor_id == current_user.id)).all()
