"""Mi cartera inmobiliaria: las viviendas, bienes y deudas de cada usuario. Cada uno solo ve y cambia lo suyo."""
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete
from sqlmodel import Session, select

import models
from database import get_session
from schemas import PortfolioItemRequest, PortfolioPropertyRequest
from security import get_current_user
from services import portfolio

router = APIRouter()

MAX_PROPERTIES = 100
MAX_ITEMS = 100


def _owned(session: Session, user: models.User, prop_id: int) -> models.PortfolioProperty:
    p = session.get(models.PortfolioProperty, prop_id)
    # La de otro usuario no se distingue de una que no existe
    if p is None or p.user_id != user.id:
        raise HTTPException(status_code=404, detail="Vivienda no encontrada")
    return p


def _checked(data: PortfolioPropertyRequest) -> dict:
    values = data.model_dump()
    if data.purchase_date and data.purchase_date > date.today():
        raise HTTPException(status_code=422, detail="La fecha de compra no puede ser futura")
    if data.municipio:
        m = portfolio.find_municipio(data.municipio, data.provincia)
        if m is None:
            raise HTTPException(status_code=422, detail="Ese municipio no está en la estadística oficial (solo municipios de más de "
                                                        "25.000 habitantes). Elige el más cercano o indica tú el valor actual.")
        values["municipio"], values["provincia"] = m["municipio"], m["provincia"]
    else:
        values["provincia"] = None
    return values


@router.get("/api/portfolio")
async def get_portfolio(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    props = session.exec(select(models.PortfolioProperty).where(models.PortfolioProperty.user_id == current_user.id)
                         .order_by(models.PortfolioProperty.id)).all()
    items = session.exec(select(models.PortfolioItem).where(models.PortfolioItem.user_id == current_user.id)
                         .order_by(models.PortfolioItem.id)).all()
    return {
        "viviendas": [portfolio.property_out(p) for p in props],
        "otros": [i.model_dump(exclude={"user_id", "created_at"}) for i in items],
        "resumen": portfolio.summary(list(props), list(items)),
        "evolucion": portfolio.evolution(list(props)),
        "datos_oficiales": portfolio.source(),
    }


@router.post("/api/portfolio/properties")
async def add_portfolio_property(data: PortfolioPropertyRequest, current_user: models.User = Depends(get_current_user),
                                 session: Session = Depends(get_session)):
    count = len(session.exec(select(models.PortfolioProperty.id).where(models.PortfolioProperty.user_id == current_user.id)).all())
    if count >= MAX_PROPERTIES:
        raise HTTPException(status_code=422, detail=f"Como mucho {MAX_PROPERTIES} viviendas")
    p = models.PortfolioProperty(user_id=current_user.id, **_checked(data))
    session.add(p)
    session.commit()
    session.refresh(p)
    return portfolio.property_out(p)


@router.put("/api/portfolio/properties/{prop_id}")
async def update_portfolio_property(prop_id: int, data: PortfolioPropertyRequest, current_user: models.User = Depends(get_current_user),
                                    session: Session = Depends(get_session)):
    p = _owned(session, current_user, prop_id)
    for key, value in _checked(data).items():
        setattr(p, key, value)
    p.updated_at = datetime.now()
    session.add(p)
    session.commit()
    session.refresh(p)
    return portfolio.property_out(p)


@router.delete("/api/portfolio/properties/{prop_id}")
async def delete_portfolio_property(prop_id: int, current_user: models.User = Depends(get_current_user),
                                    session: Session = Depends(get_session)):
    session.delete(_owned(session, current_user, prop_id))
    session.commit()
    return {"message": "Vivienda eliminada de tu cartera"}


@router.put("/api/portfolio/items")
async def replace_portfolio_items(items: List[PortfolioItemRequest], current_user: models.User = Depends(get_current_user),
                                  session: Session = Depends(get_session)):
    """Sustituye la lista de otros bienes y deudas (la página la guarda entera al cambiarla)."""
    if len(items) > MAX_ITEMS:
        raise HTTPException(status_code=422, detail=f"Como mucho {MAX_ITEMS} elementos")
    session.execute(delete(models.PortfolioItem).where(models.PortfolioItem.user_id == current_user.id))
    for i in items:
        session.add(models.PortfolioItem(user_id=current_user.id, **i.model_dump()))
    session.commit()
    saved = session.exec(select(models.PortfolioItem).where(models.PortfolioItem.user_id == current_user.id)
                         .order_by(models.PortfolioItem.id)).all()
    return [i.model_dump(exclude={"user_id", "created_at"}) for i in saved]


@router.get("/api/portfolio/municipios")
async def search_municipios(q: str = Query(min_length=2, max_length=60), current_user: models.User = Depends(get_current_user)):
    """Municipios con datos oficiales de valor tasado, para el buscador del formulario."""
    return portfolio.search_municipios(q)
