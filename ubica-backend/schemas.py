"""Modelos Pydantic de entrada y salida de la API (los de base de datos están en models.py)."""
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StrictBool, StrictInt, field_validator

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
    # Casilla obligatoria del formulario: condiciones y política de privacidad
    accept_terms: bool = False

class User(UserBase):
    id: int
    is_approved: bool = True
    terms_accepted_at: Optional[datetime] = None
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
    # Aprobar (o retirar la aprobación de) una inmobiliaria
    is_approved: Optional[StrictBool] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    # ID token (JWT) que devuelve el botón de Google
    credential: str = Field(min_length=20, max_length=4096)
    # Solo para cuentas nuevas: se crean cuando la persona elige el tipo de cuenta y acepta las condiciones
    role: Optional[Literal["user", "investor", "realtor"]] = None
    accept_terms: StrictBool = False

class GoogleSignupRequired(BaseModel):
    """Correo de Google sin cuenta: falta elegir el tipo de cuenta y aceptar las condiciones."""
    needs_signup: Literal[True] = True
    email: str
    full_name: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH)

class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str

class ContactRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=50)
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(min_length=10, max_length=5000)
    # Desde qué web llega: el buzón distingue las consultas de Ubica de los presupuestos de AMI Fincas
    source: Literal["ubica", "ami"] = "ubica"

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
    users_by_role: Dict[str, int]
    properties_by_status: Dict[str, int]

class PublicProperty(BaseModel):
    """Anuncio tal como lo ve el público: sin datos económicos privados ni ids de propietario/inmobiliaria."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    price: float
    type: str
    status: str
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: Optional[str] = None
    description: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    features: List[str] = Field(default_factory=list)
    year_built: Optional[int] = None
    energy_rating: Optional[str] = None
    orientation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("images", "features", mode="before")
    @classmethod
    def none_as_empty(cls, value):
        return value or []

class GameScoreResponse(BaseModel):
    id: int
    user_id: int
    user_name: Optional[str] = None
    game_name: str
    score: int
    created_at: datetime

MAX_GAME_SCORE = 10_000_000

class GameScoreRequest(BaseModel):
    game_name: str
    score: StrictInt = Field(ge=0, le=MAX_GAME_SCORE)

MAX_CHAT_HISTORY = 20
MAX_CHAT_CONTENT = 4000

class ListingDraftRequest(BaseModel):
    # Mensaje del vendedor (p. ej. copiado de WhatsApp)
    text: str = Field(min_length=3, max_length=4000)

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
