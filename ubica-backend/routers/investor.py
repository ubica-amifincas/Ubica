"""Panel de inversor (rol investor)."""
from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

import models
from database import get_session
from security import require_role

router = APIRouter()

@router.get("/api/investor/dashboard")
async def get_investor_dashboard(current_user: models.User = Depends(require_role(["investor"])), session: Session = Depends(get_session)):
    investments = session.exec(select(models.Investment).where(models.Investment.investor_id == current_user.id)).all()
    n = len(investments)

    def total(field):
        return float(sum(getattr(i, field) or 0 for i in investments))

    def average(field):
        return total(field) / n if n else 0.0

    portfolio_value = total("current_value")
    total_investment = total("investment_amount")
    return {
        "portfolio_value": portfolio_value,
        "total_properties": n,
        "monthly_income": total("annual_rental_income") / 12,
        "average_roi": average("roi_percentage"),
        "total_investment": total_investment,
        "unrealized_gains": portfolio_value - total_investment,
        "rental_yield": average("rental_yield"),
        "appreciation_rate": average("appreciation_rate")
    }

@router.get("/api/investor/portfolio", response_model=List[models.Investment])
async def get_investor_portfolio(current_user: models.User = Depends(require_role(["investor"])), session: Session = Depends(get_session)):
    return session.exec(select(models.Investment).where(models.Investment.investor_id == current_user.id)).all()
