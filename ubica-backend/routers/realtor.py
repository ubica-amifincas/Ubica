"""Panel de inmobiliaria (rol realtor)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

import models
from database import get_session
from security import require_role

router = APIRouter()

@router.get("/api/realtor/dashboard")
async def get_realtor_dashboard(current_user: models.User = Depends(require_role(["realtor"])), session: Session = Depends(get_session)):
    my_properties = session.exec(select(models.Property).where(models.Property.realtor_id == current_user.id)).all()
    avg_price = sum(p.price for p in my_properties) / len(my_properties) if my_properties else 0
    return {
        "total_properties": len(my_properties),
        "properties_sold": 15,
        "properties_rented": 8,
        "total_commissions": 45000.0,
        "this_month_sales": 3,
        "this_month_rentals": 2,
        "avg_sale_price": float(avg_price),
        "performance_score": 8.7
    }

@router.get("/api/realtor/properties", response_model=List[models.Property])
async def get_realtor_properties(current_user: models.User = Depends(require_role(["realtor"])), session: Session = Depends(get_session)):
    return session.exec(select(models.Property).where(models.Property.realtor_id == current_user.id)).all()
