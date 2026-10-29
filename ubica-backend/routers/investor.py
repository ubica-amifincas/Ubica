"""Panel de inversor (rol investor)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

import models
from database import get_session
from security import require_role

router = APIRouter()

@router.get("/api/investor/dashboard")
async def get_investor_dashboard(current_user: models.User = Depends(require_role(["investor"]))):
    return {
        "portfolio_value": 875000.0,
        "total_properties": 12,
        "monthly_income": 5200.0,
        "average_roi": 8.3,
        "total_investment": 720000.0,
        "unrealized_gains": 155000.0,
        "rental_yield": 7.2,
        "appreciation_rate": 4.8
    }

@router.get("/api/investor/portfolio", response_model=List[models.Investment])
async def get_investor_portfolio(current_user: models.User = Depends(require_role(["investor"])), session: Session = Depends(get_session)):
    return session.exec(select(models.Investment).where(models.Investment.investor_id == current_user.id)).all()
