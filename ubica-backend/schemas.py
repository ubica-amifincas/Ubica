"""Modelos Pydantic de entrada y salida de la API (los de base de datos están en models.py)."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, StrictBool, field_validator

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

Role = Literal["user", "investor", "realtor", "admin"]
MIN_PASSWORD_LENGTH = 8

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    full_name: Optional[str] = None
    role: Role = "user"
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: StrictBool = True

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=MIN_PASSWORD_LENGTH)
    full_name: Optional[str] = None
    role: Optional[Role] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[StrictBool] = None

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

MAX_CHAT_HISTORY = 20
MAX_CHAT_CONTENT = 4000

class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: List[Dict[str, Any]] = Field(default_factory=list, max_length=500)
    conversation_id: Optional[int] = None

    @field_validator("history")
    @classmethod
    def clean_history(cls, history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        # Solo turnos de usuario y asistente, recortados: el cliente no puede colar mensajes de sistema
        turns = [{"role": m["role"], "content": str(m.get("content", ""))[:MAX_CHAT_CONTENT]}
                 for m in history if m.get("role") in ("user", "assistant")]
        return turns[-MAX_CHAT_HISTORY:]
