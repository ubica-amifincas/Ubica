from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, JSON, Column
from pydantic import EmailStr

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
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
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
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
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
    created_at: datetime = Field(default_factory=datetime.now)
    
    sender: User = Relationship(back_populates="messages_sent")

class Favorite(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    property_id: int = Field(foreign_key="property.id")
    created_at: datetime = Field(default_factory=datetime.now)
    
    user: User = Relationship(back_populates="favorites")
    property: Property = Relationship(back_populates="favorited_by")

class SavedSearch(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    name: str
    filters: str # JSON string
    created_at: datetime = Field(default_factory=datetime.now)

class Investment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    property_id: int = Field(foreign_key="property.id")
    investor_id: int = Field(foreign_key="user.id")
    investment_amount: float
    current_value: float
    purchase_price: float
    purchase_date: datetime
    roi_percentage: float
    annual_rental_income: float
    rental_yield: float
    appreciation_rate: float
    holding_period_months: int
    status: str = "active"
