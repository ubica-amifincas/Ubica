"""Comprobaciones de estado para Render y monitorización."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

import models
from database import get_session

router = APIRouter()

@router.get("/api/ping")
async def ping():
    """Endpoint muy ligero para scripts de Keep-Awake (cron-job.org) y evitar el spin-down de Render."""
    return {"status": "ok", "message": "pong"}

@router.get("/health")
async def health_check(session: Session = Depends(get_session)):
    total_properties = session.exec(select(func.count(models.Property.id))).one()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "database": "connected",
        "total_properties": total_properties
    }
