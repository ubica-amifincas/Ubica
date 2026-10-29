"""Modelos Pydantic de entrada y salida de la API (los de base de datos están en models.py)."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "user"
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_verified: bool = True  # Por defecto True para usuarios mock

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: Any

class DashboardStats(BaseModel):
    total_properties: int
    total_users: int
    total_transactions: int
    total_revenue: float
    properties_sold_this_month: int
    properties_rented_this_month: int
    average_roi: float
    market_growth: float

class GameScoreResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    game_name: str
    score: int
    created_at: datetime

class GameScoreRequest(BaseModel):
    game_name: str
    score: int

class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []
    conversation_id: Optional[int] = None
