from datetime import date, datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from pydantic import EmailStr, NaiveDatetime

class UserBase(SQLModel):
    email: EmailStr = Field(index=True, unique=True)
    full_name: Optional[str] = None
    role: str = "user"
    company: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    is_verified: bool = True

class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    # Inmobiliarias dadas de alta por sí mismas: hasta que el admin las aprueba, sus anuncios pasan revisión
    is_approved: bool = True
    # Cuándo aceptó las condiciones y la política de privacidad (RGPD)
    terms_accepted_at: Optional[NaiveDatetime] = None
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    properties: List["Property"] = Relationship(back_populates="owner")
    messages_sent: List["Message"] = Relationship(back_populates="sender")
    favorites: List["Favorite"] = Relationship(back_populates="user")

class PropertyBase(SQLModel):
    title: str
    price: float
    type: str
    status: str = "available"
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    area: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    region: str = "Murcia"
    description: Optional[str] = None
    images: List[str] = Field(default=[], sa_column=Column(JSON))
    features: List[str] = Field(default=[], sa_column=Column(JSON))
    year_built: Optional[int] = None
    energy_rating: Optional[str] = None
    orientation: Optional[str] = None
    # Financial fields
    purchase_price: Optional[float] = 0
    total_cost: Optional[float] = 0
    monthly_cost: Optional[float] = 0
    monthly_income: Optional[float] = 0

class Property(PropertyBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")
    realtor_id: Optional[int] = None # For simplicity, keeping as ID for now
    # Revisión: estado que tendrá al aprobarlo (en venta, en alquiler...) y motivo si se rechaza
    pending_status: Optional[str] = None
    review_note: Optional[str] = None
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    owner: Optional[User] = Relationship(back_populates="properties")
    favorited_by: List["Favorite"] = Relationship(back_populates="property")

class Message(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    receiver_id: Optional[int] = None
    property_id: Optional[int] = Field(default=None, foreign_key="property.id")
    realtor_id: Optional[int] = None
    sender_name: Optional[str] = None
    property_title: Optional[str] = None
    content: str
    status: str = "pending"
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    sender: User = Relationship(back_populates="messages_sent")

class Favorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    property_id: int = Field(foreign_key="property.id")
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    user: User = Relationship(back_populates="favorites")
    property: Property = Relationship(back_populates="favorited_by")

class SavedSearch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    filters: str # JSON string
    created_at: NaiveDatetime = Field(default_factory=datetime.now)

class Investment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    property_id: int = Field(foreign_key="property.id")
    investor_id: int = Field(foreign_key="user.id")
    investment_amount: float
    current_value: float
    purchase_price: float
    purchase_date: NaiveDatetime
    roi_percentage: float
    annual_rental_income: float
    rental_yield: float
    appreciation_rate: float
    holding_period_months: int
    status: str = "active"

class GameScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    game_name: str = Field(index=True)
    score: int = Field(index=True)
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    user: User = Relationship()

class TasadorGuess(SQLModel, table=True):
    """Respuesta de un jugador con cuenta a una ronda del reto diario del Tasador Exprés: solo cuenta la primera."""
    __table_args__ = (UniqueConstraint("user_id", "day", "round_index"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    day: str = Field(index=True)  # AAAA-MM-DD, hora de Madrid
    round_index: int
    guess: float
    points: int
    created_at: NaiveDatetime = Field(default_factory=datetime.now)

class TasadorDay(SQLModel, table=True):
    """Las rondas del reto diario, fijadas la primera vez que se piden: publicar o quitar un anuncio a mitad
    de día no debe cambiar el reto de ese día (ni descuadrar las respuestas ya guardadas)."""
    day: str = Field(primary_key=True)  # AAAA-MM-DD, hora de Madrid
    rounds: List[Dict[str, Any]] = Field(sa_column=Column(JSON))
    created_at: NaiveDatetime = Field(default_factory=datetime.now)

class PortfolioProperty(SQLModel, table=True):
    """Vivienda que el usuario tiene en propiedad (Mi cartera inmobiliaria). Solo la ve su dueño."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str
    address: Optional[str] = None
    # Municipio de la estadística oficial de valor tasado: con él se estima la revalorización
    municipio: Optional[str] = None
    provincia: Optional[str] = None
    area_m2: Optional[float] = None
    purchase_price: float
    purchase_date: Optional[date] = None
    purchase_costs: float = 0  # impuestos, notaría, gestoría, reforma inicial
    current_value_manual: Optional[float] = None  # si el usuario prefiere su propia valoración
    mortgage_pending: float = 0
    mortgage_monthly: float = 0
    rent_monthly: float = 0
    community_monthly: float = 0
    ibi_yearly: float = 0
    insurance_yearly: float = 0
    other_yearly: float = 0
    notes: Optional[str] = None
    created_at: NaiveDatetime = Field(default_factory=datetime.now)
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)

class PortfolioItem(SQLModel, table=True):
    """Otros bienes (ahorros, vehículo...) y deudas (préstamos...) de Mi cartera."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    kind: str  # asset | liability
    name: str
    description: Optional[str] = None
    amount: float
    created_at: NaiveDatetime = Field(default_factory=datetime.now)

class AIConversation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    title: str = Field(max_length=150)
    messages: List[Dict[str, Any]] = Field(default=[], sa_column=Column(JSON))
    updated_at: NaiveDatetime = Field(default_factory=datetime.now)
    
    user: User = Relationship()
