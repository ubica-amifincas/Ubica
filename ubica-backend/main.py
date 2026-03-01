#!/usr/bin/env python3
"""
Ubica Enterprise Backend - Servidor de desarrollo FastAPI
Simula la funcionalidad completa enterprise con datos JSON
"""

from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
import json
import jwt
import hashlib
import os
import shutil
import uuid
import io
import pandas as pd
import aiohttp
import asyncio
from datetime import datetime, timedelta
import uvicorn
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv

# --- AI & MCP Server Imports ---
try:
    import google.generativeai as genai
    from google.generativeai.types import content_types
    from mcp_server import buscar_propiedades, obtener_detalles_propiedad
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("WARNING: google-generativeai or mcp_server not installed. AI features will be mocked.")

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Google Gemini AI configured successfully!")
else:
    print("No GEMINI_API_KEY found or Gemini unavailable. AI chat will use fallback/mock.")

# Configuración JWT
SECRET_KEY = "ubica-enterprise-secret-key-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Configuración Email SMTP (Gmail por defecto)
# Reemplaza estas credenciales o usa variables de entorno en producción
mail_conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME", "verify.ubica@gmail.com"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "lerb wdpr lkbb yvzv"),
    MAIL_FROM = os.getenv("MAIL_FROM", "verify.ubica@gmail.com"),
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_FROM_NAME="Ubica Support",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

# Inicializar FastAPI
app = FastAPI(
    title="Ubica Enterprise API",
    description="API completa para plataforma inmobiliaria enterprise",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurar directorio de uploads
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Security
security = HTTPBearer(auto_error=False)


# Modelos Pydantic
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

class UserInDB(UserBase):
    id: int
    hashed_password: str
    created_at: datetime
    updated_at: datetime

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
    user: User

class PropertyBase(BaseModel):
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
    images: Optional[List[str]] = []
    features: Optional[List[str]] = []
    year_built: Optional[int] = None
    energy_rating: Optional[str] = None
    orientation: Optional[str] = None
    # Campos financieros de inversión
    purchase_price: Optional[float] = 0
    total_cost: Optional[float] = 0
    monthly_cost: Optional[float] = 0
    monthly_income: Optional[float] = 0

class Property(PropertyBase):
    id: int
    owner_id: Optional[int] = None
    realtor_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class Favorite(BaseModel):
    id: int
    user_id: int
    property_id: int
    created_at: datetime = Field(default_factory=datetime.now)

class Message(BaseModel):
    id: int
    user_id: int  # quien envía
    receiver_id: Optional[int] = None  # quien recibe (owner de la propiedad)
    property_id: Optional[int] = None
    realtor_id: Optional[int] = None
    sender_name: Optional[str] = None
    property_title: Optional[str] = None
    content: str
    status: str = "pending"  # pending, read, replied
    created_at: datetime = Field(default_factory=datetime.now)

class SavedSearch(BaseModel):
    id: int
    user_id: int
    name: str
    filters: str # JSON string for simplicity
    created_at: datetime = Field(default_factory=datetime.now)

class Investment(BaseModel):
    id: int
    property_id: int
    investor_id: int
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

class DashboardStats(BaseModel):
    total_properties: int
    total_users: int
    total_transactions: int
    total_revenue: float
    properties_sold_this_month: int
    properties_rented_this_month: int
    average_roi: float
    market_growth: float

# Directorio de bases de datos JSON
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
USERS_FILE = os.path.join(DB_DIR, "users.json")
PROPERTIES_FILE = os.path.join(DB_DIR, "properties.json")
FAVORITES_FILE = os.path.join(DB_DIR, "favorites.json")
MESSAGES_FILE = os.path.join(DB_DIR, "messages.json")
SEARCHES_FILE = os.path.join(DB_DIR, "searches.json")
AI_USAGE_FILE = os.path.join(DB_DIR, "ai_usage.json")


# Base de datos en memoria (cargadas al vuelo)
users_db: List[UserInDB] = []
properties_db: List[Property] = []
investments_db: List[Investment] = []
favorites_db: List[Favorite] = []
messages_db: List[Message] = []
searches_db: List[SavedSearch] = []
ai_usage_db: Dict[str, Any] = {}


def save_db():
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump([u.dict() for u in users_db], f, default=str, indent=2)
    with open(PROPERTIES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in properties_db], f, default=str, indent=2)
    with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in favorites_db], f, default=str, indent=2)
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in messages_db], f, default=str, indent=2)
    with open(SEARCHES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in searches_db], f, default=str, indent=2)

def load_ai_usage():
    global ai_usage_db
    if os.path.exists(AI_USAGE_FILE):
        try:
            with open(AI_USAGE_FILE, "r", encoding="utf-8") as f:
                ai_usage_db = json.load(f)
        except:
            ai_usage_db = {}

def save_ai_usage():
    with open(AI_USAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(ai_usage_db, f, indent=2)


def load_db():
    global users_db, properties_db
    
    # --- Cargar Usuarios ---
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            users_db = [UserInDB(**u) for u in data]
    else:
        users_db = [
            UserInDB(
                id=1, email="admin@amifincas.es", hashed_password="240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
                full_name="Administrador Ubica", role="admin", company="Ubica Enterprise",
                phone="+34 968 123 456", is_active=True, created_at=datetime.now(), updated_at=datetime.now()
            ),
            UserInDB(
                id=2, email="inmobiliaria1@amifincas.es", hashed_password="7c4a8d09ca3762af61e59520943dc26494f8941b",
                full_name="Costa Cálida Properties", role="realtor", company="Costa Cálida Properties SL",
                phone="+34 968 234 567", is_active=True, created_at=datetime.now(), updated_at=datetime.now()
            ),
            UserInDB(
                id=3, email="inversor1@amifincas.es", hashed_password="8b96f4e9b73fc4d2a8b19e9e8d1d8e9a8b96f4e9",
                full_name="Inversiones Mediterráneo", role="investor", company="Inversiones Mediterráneo SA",
                phone="+34 968 345 678", is_active=True, created_at=datetime.now(), updated_at=datetime.now()
            )
        ]

    # --- Cargar Propiedades ---
    if os.path.exists(PROPERTIES_FILE):
        with open(PROPERTIES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            properties_db = [Property(**p) for p in data]
    else:
        try:
            # Intentar cargar las propiedades de prueba si "properties.json" no existe
            file_path = os.path.join(os.path.dirname(__file__), '..', 'ubica-portal', 'public', 'propertiesMurcia.json')
            if not os.path.exists(file_path):
                 file_path = '../ubica-portal/public/propertiesMurcia.json'
                 
            with open(file_path, 'r', encoding='utf-8') as f:
                properties_data = json.load(f)
                
            for i, prop_data in enumerate(properties_data, 1):
                property_obj = Property(
                    id=i, title=prop_data.get('title', ''), price=prop_data.get('price', 0),
                    type=prop_data.get('type', 'Casa'), status=prop_data.get('status', 'available'),
                    bedrooms=prop_data.get('bedrooms'), bathrooms=prop_data.get('bathrooms'),
                    area=prop_data.get('area'), 
                    latitude=prop_data.get('coordinates', {}).get('lat') if isinstance(prop_data.get('coordinates'), dict) else prop_data.get('latitude'),
                    longitude=prop_data.get('coordinates', {}).get('lng') if isinstance(prop_data.get('coordinates'), dict) else prop_data.get('longitude'),
                    address=prop_data.get('address', ''), city=prop_data.get('city', ''),
                    region="Murcia", description=prop_data.get('description', ''),
                    images=prop_data.get('images', []), features=prop_data.get('features', []),
                    year_built=prop_data.get('yearBuilt'), energy_rating=prop_data.get('energyRating'),
                    orientation=prop_data.get('orientation'), owner_id=1,
                    realtor_id=2 if i % 2 == 0 else 3, created_at=datetime.now(), updated_at=datetime.now()
                )
                properties_db.append(property_obj)
                save_db()
        except Exception as e:
            print(f"Error loading properties: {e}")
            
    # --- Cargar Favoritos, Mensajes, Busquedas ---
    global favorites_db, messages_db, searches_db
    if os.path.exists(FAVORITES_FILE):
        with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            favorites_db = [Favorite(**d) for d in data]
    if os.path.exists(MESSAGES_FILE):
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            messages_db = [Message(**d) for d in data]
    if os.path.exists(SEARCHES_FILE):
        with open(SEARCHES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            searches_db = [SavedSearch(**d) for d in data]

    # Guardar por si acabamos de generar los datos por defecto
    save_db()

# Cargar base de datos al inicio
load_db()
load_ai_usage()



# Utilidades
def hash_password(password: str) -> str:
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict):
    from datetime import datetime, timedelta
    import jwt
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    import jwt
    from fastapi import HTTPException
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = next((u for u in users_db if u.id == user_id), None)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user.dict())

def require_role(required_roles: list):
    from fastapi import HTTPException
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {required_roles}"
            )
        return current_user
    return role_checker


def check_ai_usage(user_id: Optional[int] = None, ip: str = "unknown", role: str = "guest"):
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Re-cargar para sincronía simple si varios hilos corren (aunque uvicorn reload=True es single worker por defecto)
    load_ai_usage()
    
    # Inicializar datos del día si no existen
    if today not in ai_usage_db:
        ai_usage_db[today] = {"users": {}, "ips": {}}
        save_ai_usage()
    
    # Roles profesionales tienen barra libre por ahora
    if role in ["admin", "realtor", "investor"]:
        return True
        
    limit = 10 if user_id else 3


    
    if user_id:
        count = ai_usage_db[today]["users"].get(str(user_id), 0)
        if count >= limit:
            return False
        ai_usage_db[today]["users"][str(user_id)] = count + 1
    else:
        count = ai_usage_db[today]["ips"].get(ip, 0)
        if count >= limit:
            return False
        ai_usage_db[today]["ips"][ip] = count + 1
        
    save_ai_usage()
    return True

def get_user_or_none(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
        user_in_db = next((u for u in users_db if u.id == user_id), None)
        if user_in_db:
            return User(**user_in_db.dict())
        return None
    except:
        return None



# Endpoints de Autenticación
@app.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = next((u for u in users_db if u.email == login_data.email), None)
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    
    if not getattr(user, 'is_verified', True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Por favor verifica tu correo electrónico para iniciar sesión"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User(**user.dict())
    )

@app.post("/api/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate):
    if any(u.email == user_data.email for u in users_db):
        raise HTTPException(status_code=400, detail="El email ya está registrado")
        
    new_id = max((u.id for u in users_db), default=0) + 1
    
    new_user = UserInDB(
        id=new_id,
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        company=user_data.company,
        phone=user_data.phone,
        is_active=True,
        is_verified=False,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    users_db.append(new_user)
    save_db()
    
    # Generar token de verificación
    verify_token = create_access_token(data={"sub": new_id, "type": "verify"})
    verification_link = f"http://localhost:5173/verify?token={verify_token}"
    
    # Preparar el correo con FastMail
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <h2 style="color: #4a9d78;">¡Bienvenido a Ubica Enterprise!</h2>
        <p>Hola {user_data.full_name or 'Usuario'},</p>
        <p>Gracias por crear tu cuenta. Para activar tu perfil y poder iniciar sesión, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente enlace:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="{verification_link}" style="background-color: #4a9d78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verificar mi cuenta</a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p><a href="{verification_link}" style="color: #4a9d78;">{verification_link}</a></p>
        <p>Si no has solicitado este registro, puedes ignorar este correo.</p>
        <p>Atentamente,<br>El equipo de Ubica Fincas</p>
      </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Verifica tu cuenta en Ubica Enterprise",
        recipients=[user_data.email],
        body=html_content,
        subtype=MessageType.html
    )

    fm = FastMail(mail_conf)
    try:
        await fm.send_message(message)
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✅ Correo de verificación enviado exitosamente a {user_data.email}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ❌ Error enviando correo a {user_data.email}: {e}")
    
    return {
        "message": "Usuario registrado exitosamente. Por favor revisa tu correo electrónico para verificar tu cuenta.",
        "user_id": new_id
    }

@app.get("/api/auth/verify-email")
async def verify_email(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "verify":
            raise HTTPException(status_code=400, detail="Token inválido")
            
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token expirado o inválido")
        
    user = next((u for u in users_db if u.id == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if getattr(user, 'is_verified', False):
        return {"message": "El correo ya había sido verificado"}
        
    user.is_verified = True
    user.updated_at = datetime.now()
    save_db()
    
    return {"message": "Correo verificado exitosamente. Ya puedes iniciar sesión."}

@app.get("/api/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@app.post("/api/upload-images")
async def upload_images(files: List[UploadFile] = File(...)):
    uploaded_urls = []
    base_url = "http://localhost:8000/uploads" # Idealmente esto vendría de una variable de entorno
    
    for file in files:
        # Generar nombre único
        ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        uploaded_urls.append(f"{base_url}/{unique_filename}")
        
    return {"urls": uploaded_urls}

# Endpoints Públicos
@app.get("/api/properties", response_model=List[Property])
async def get_properties(skip: int = 0, limit: int = 20):
    # Solo mostrar propiedades en venta o en alquiler en el listado público
    public_statuses = ['for-sale', 'for-rent']
    public_props = [p for p in properties_db if p.status in public_statuses]
    return public_props[skip:skip + limit]

@app.get("/api/properties/{property_id}", response_model=Property)
async def get_property(property_id: int):
    property_obj = next((p for p in properties_db if p.id == property_id), None)
    if not property_obj:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    return property_obj

@app.get("/api/stats/market")
async def get_market_stats():
    return {
        "total_properties": len(properties_db),
        "average_price": sum(p.price for p in properties_db) / len(properties_db) if properties_db else 0,
        "cities": list(set(p.city for p in properties_db if p.city)),
        "property_types": list(set(p.type for p in properties_db)),
        "market_trend": "+5.2%",
        "last_updated": datetime.now().isoformat()
    }

# Endpoints Admin
@app.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(current_user: User = Depends(require_role(["admin"]))):
    return DashboardStats(
        total_properties=len(properties_db),
        total_users=len(users_db),
        total_transactions=45,
        total_revenue=1250000.0,
        properties_sold_this_month=12,
        properties_rented_this_month=8,
        average_roi=7.8,
        market_growth=5.2
    )

@app.get("/api/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(require_role(["admin"]))):
    return [User(**u.dict()) for u in users_db]

@app.post("/api/admin/users", response_model=User)
async def create_user(user_data: dict, current_user: User = Depends(require_role(["admin"]))):
    # Verify email doesn't exist
    if any(u.email == user_data.get('email') for u in users_db):
        raise HTTPException(status_code=400, detail="El email ya está registrado")
        
    new_id = max((u.id for u in users_db), default=0) + 1
    
    password = user_data.get('password', 'password123')
    
    new_user = UserInDB(
        id=new_id,
        email=user_data.get('email'),
        hashed_password=hash_password(password),
        full_name=user_data.get('full_name'),
        role=user_data.get('role', 'user'),
        company=user_data.get('company'),
        phone=user_data.get('phone'),
        is_active=user_data.get('is_active', True),
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    users_db.append(new_user)
    save_db()
    return User(**new_user.dict())

@app.put("/api/admin/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_data: dict, current_user: User = Depends(require_role(["admin"]))):
    idx = next((i for i, u in enumerate(users_db) if u.id == user_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    u = users_db[idx]
    
    # Optional email check
    new_email = user_data.get('email')
    if new_email and new_email != u.email:
        if any(user.email == new_email for user in users_db if user.id != user_id):
            raise HTTPException(status_code=400, detail="El email ya está registrado por otro usuario")
        u.email = new_email
        
        
    u.full_name = user_data.get('full_name', u.full_name)
    u.role = user_data.get('role', u.role)
    u.company = user_data.get('company', u.company)
    u.phone = user_data.get('phone', u.phone)
    if 'is_active' in user_data:
        u.is_active = user_data['is_active']
        
    # Cambio de contraseña por el admin
    new_password = user_data.get('password')
    if new_password:
        u.hashed_password = hash_password(new_password)
        
    u.updated_at = datetime.now()
    save_db()
    return User(**u.dict())

@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, current_user: User = Depends(require_role(["admin"]))):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
    idx = next((i for i, u in enumerate(users_db) if u.id == user_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    del users_db[idx]
    save_db()
    return {"message": "Usuario eliminado con éxito"}

@app.get("/api/admin/properties", response_model=List[Property])
async def get_all_properties_admin(current_user: User = Depends(require_role(["admin"]))):
    return properties_db

async def download_image(session: aiohttp.ClientSession, url: str, uploads_dir: str) -> str:
    try:
        async with session.get(url, timeout=10) as response:
            if response.status == 200:
                ext = ".jpg" # Default to jpg
                # Try to get extension from url
                parsed_ext = os.path.splitext(url)[1].split('?')[0] # Remove query params
                if parsed_ext:
                   ext = parsed_ext
                unique_filename = f"{uuid.uuid4()}{ext}"
                file_path = os.path.join(uploads_dir, unique_filename)
                
                content = await response.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                    
                return f"http://localhost:8000/uploads/{unique_filename}"
    except Exception as e:
        print(f"Error downloading image {url}: {e}")
    return ""

@app.post("/api/admin/properties/import")
async def import_properties(file: UploadFile = File(...), current_user: User = Depends(require_role(["admin"]))):
    content = await file.read()
    
    # Intenta leer como CSV o Excel o JSON
    try:
        if file.filename.endswith('.csv'):
            # Probar varios separadores por defecto
            try:
                df = pd.read_csv(io.BytesIO(content), sep=',')
                if len(df.columns) == 1:
                    df = pd.read_csv(io.BytesIO(content), sep=';')
            except:
                df = pd.read_csv(io.BytesIO(content), sep=';')
        elif file.filename.endswith('.json'):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado, usa CSV o JSON")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo el archivo: {str(e)}")

    # Normalizar nombres de columnas a minusculas
    df.columns = df.columns.str.lower().str.strip()
    
    # Map común de nombres de columnas que suelen usar las herramientas de scraping
    col_map = {
        'titulo': 'title', 'nombre': 'title', 'name': 'title',
        'precio': 'price', 'coste': 'price',
        'tipo': 'type', 'vivienda': 'type',
        'estado': 'status',
        'habitaciones': 'bedrooms', 'cuartos': 'bedrooms', 'dormitorios': 'bedrooms',
        'baños': 'bathrooms', 'banos': 'bathrooms',
        'metros': 'area', 'superficie': 'area', 'm2': 'area',
        'descripcion': 'description', 'desc': 'description',
        'localidad': 'location', 'ciudad': 'location', 'city': 'location',
        'direccion': 'address', 'calle': 'address',
        'imagenes': 'images', 'fotos': 'images', 'photos': 'images', 'urls': 'images'
    }
    
    df.rename(columns=col_map, inplace=True)
    
    properties_added = 0
    errors = []
    
    async with aiohttp.ClientSession() as session:
        for index, row in df.iterrows():
            try:
                # Datos minimos requeridos
                title = str(row.get('title', f"Propiedad en Murcia {index}"))
                if title == 'nan': title = f"Propiedad importada {index}"
                
                try: 
                    price = float(row.get('price', 0))
                except: 
                    price = 0.0

                raw_images = str(row.get('images', ''))
                local_image_urls = []
                
                if raw_images and raw_images != 'nan':
                    # Separar por comas o saltos de linea
                    img_urls = [u.strip() for u in raw_images.replace('\n', ',').split(',') if u.strip().startswith('http')]
                    if img_urls:
                        # Descargar imagenes concurrentemente
                        tasks = [download_image(session, url, UPLOAD_DIR) for url in img_urls[:5]] # Max 5 imagenes por propiedad para no saturar
                        results = await asyncio.gather(*tasks)
                        local_image_urls = [r for r in results if r]
                
                new_id = max((p.id for p in properties_db), default=0) + 1
                
                new_property = Property(
                    id=new_id,
                    title=title,
                    price=price,
                    type=str(row.get('type', 'Casa')) if str(row.get('type')) != 'nan' else 'Casa',
                    status='for-sale',
                    bedrooms=int(row.get('bedrooms')) if pd.notna(row.get('bedrooms')) else 2,
                    bathrooms=int(row.get('bathrooms')) if pd.notna(row.get('bathrooms')) else 1,
                    area=float(row.get('area')) if pd.notna(row.get('area')) else 80.0,
                    city=str(row.get('location', 'Murcia')) if str(row.get('location')) != 'nan' else 'Murcia',
                    address=str(row.get('address', '')) if str(row.get('address')) != 'nan' else '',
                    region="Murcia",
                    description=str(row.get('description', '')) if str(row.get('description')) != 'nan' else '',
                    images=local_image_urls,
                    features=[],
                    owner_id=current_user.id,
                    realtor_id=None,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                properties_db.append(new_property)
                properties_added += 1
                
            except Exception as e:
                errors.append(f"Fila {index}: {str(e)}")
                
    save_db()
    
    return {
        "message": f"Importación completada",
        "properties_added": properties_added,
        "errors": len(errors),
        "error_details": errors[:5] # Enviar al menos 5 errores si hay
    }

@app.post("/api/admin/properties", response_model=Property)
async def create_property(prop_data: dict, current_user: User = Depends(require_role(["admin"]))):
    new_id = max((p.id for p in properties_db), default=0) + 1
    new_property = Property(
        id=new_id,
        title=prop_data.get('title', ''),
        price=prop_data.get('price', 0),
        type=prop_data.get('type', 'Casa'),
        status=prop_data.get('status', 'available'),
        bedrooms=prop_data.get('bedrooms'),
        bathrooms=prop_data.get('bathrooms'),
        area=prop_data.get('area'),
        latitude=prop_data.get('coordinates', {}).get('lat'),
        longitude=prop_data.get('coordinates', {}).get('lng'),
        address=prop_data.get('address', ''),
        city=prop_data.get('location', ''),
        region="Murcia",
        description=prop_data.get('description', ''),
        images=prop_data.get('images', []),
        features=prop_data.get('features', []),
        year_built=prop_data.get('yearBuilt'),
        energy_rating=prop_data.get('energyRating'),
        orientation=prop_data.get('orientation'),
        purchase_price=prop_data.get('purchasePrice', 0),
        total_cost=prop_data.get('totalCost', 0),
        monthly_cost=prop_data.get('monthlyCost', 0),
        monthly_income=prop_data.get('monthlyIncome', 0),
        owner_id=current_user.id,
        realtor_id=None,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    properties_db.append(new_property)
    save_db()
    return new_property

@app.put("/api/admin/properties/{property_id}", response_model=Property)
async def update_property(property_id: int, prop_data: dict, current_user: User = Depends(require_role(["admin"]))):
    idx = next((i for i, p in enumerate(properties_db) if p.id == property_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
        
    p = properties_db[idx]
    
    # Actualizar campos
    p.title = prop_data.get('title', p.title)
    p.price = prop_data.get('price', p.price)
    p.type = prop_data.get('type', p.type)
    p.status = prop_data.get('status', p.status)
    p.bedrooms = prop_data.get('bedrooms', p.bedrooms)
    p.bathrooms = prop_data.get('bathrooms', p.bathrooms)
    p.area = prop_data.get('area', p.area)
    
    coords = prop_data.get('coordinates')
    if coords:
        p.latitude = coords.get('lat', p.latitude)
        p.longitude = coords.get('lng', p.longitude)
        
    p.address = prop_data.get('address', p.address)
    p.city = prop_data.get('location', p.city)
    p.description = prop_data.get('description', p.description)
    p.images = prop_data.get('images', p.images)
    p.features = prop_data.get('features', p.features)
    p.year_built = prop_data.get('yearBuilt', p.year_built)
    p.energy_rating = prop_data.get('energyRating', p.energy_rating)
    p.orientation = prop_data.get('orientation', p.orientation)
    # Campos financieros de inversión
    p.purchase_price = prop_data.get('purchasePrice', p.purchase_price)
    p.total_cost = prop_data.get('totalCost', p.total_cost)
    p.monthly_cost = prop_data.get('monthlyCost', p.monthly_cost)
    p.monthly_income = prop_data.get('monthlyIncome', p.monthly_income)
    p.updated_at = datetime.now()
    save_db()
    
    return p

@app.delete("/api/admin/properties/{property_id}")
async def delete_property(property_id: int, current_user: User = Depends(require_role(["admin"]))):
    idx = next((i for i, p in enumerate(properties_db) if p.id == property_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    del properties_db[idx]
    save_db()
    return {"message": "Propiedad eliminada con éxito"}

# Endpoints de Usuario — Gestión de propiedades propias
# Admin ve TODAS las propiedades; otros usuarios solo las suyas
@app.get("/api/user/properties", response_model=List[Property])
async def get_user_properties(current_user: User = Depends(get_current_user)):
    if current_user.role == "admin":
        return properties_db
    return [p for p in properties_db if p.owner_id == current_user.id]

@app.post("/api/user/properties", response_model=Property)
async def create_user_property(prop_data: dict, current_user: User = Depends(get_current_user)):
    new_id = max((p.id for p in properties_db), default=0) + 1
    new_property = Property(
        id=new_id,
        title=prop_data.get('title', ''),
        price=prop_data.get('price', 0),
        type=prop_data.get('type', 'Casa'),
        status=prop_data.get('status', 'for-sale'),
        bedrooms=prop_data.get('bedrooms'),
        bathrooms=prop_data.get('bathrooms'),
        area=prop_data.get('area'),
        latitude=prop_data.get('coordinates', {}).get('lat'),
        longitude=prop_data.get('coordinates', {}).get('lng'),
        address=prop_data.get('address', ''),
        city=prop_data.get('location', ''),
        region="Murcia",
        description=prop_data.get('description', ''),
        images=prop_data.get('images', []),
        features=prop_data.get('features', []),
        year_built=prop_data.get('yearBuilt'),
        energy_rating=prop_data.get('energyRating'),
        orientation=prop_data.get('orientation'),
        purchase_price=prop_data.get('purchasePrice', 0),
        total_cost=prop_data.get('totalCost', 0),
        monthly_cost=prop_data.get('monthlyCost', 0),
        monthly_income=prop_data.get('monthlyIncome', 0),
        owner_id=current_user.id,
        realtor_id=None,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    properties_db.append(new_property)
    save_db()
    return new_property

@app.put("/api/user/properties/{property_id}", response_model=Property)
async def update_user_property(property_id: int, prop_data: dict, current_user: User = Depends(get_current_user)):
    idx = next((i for i, p in enumerate(properties_db) if p.id == property_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    
    p = properties_db[idx]
    # Solo el owner o un admin puede editar
    if p.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta propiedad")
    
    p.title = prop_data.get('title', p.title)
    p.price = prop_data.get('price', p.price)
    p.type = prop_data.get('type', p.type)
    p.status = prop_data.get('status', p.status)
    p.bedrooms = prop_data.get('bedrooms', p.bedrooms)
    p.bathrooms = prop_data.get('bathrooms', p.bathrooms)
    p.area = prop_data.get('area', p.area)
    coords = prop_data.get('coordinates')
    if coords:
        p.latitude = coords.get('lat', p.latitude)
        p.longitude = coords.get('lng', p.longitude)
    p.address = prop_data.get('address', p.address)
    p.city = prop_data.get('location', p.city)
    p.description = prop_data.get('description', p.description)
    p.images = prop_data.get('images', p.images)
    p.features = prop_data.get('features', p.features)
    p.year_built = prop_data.get('yearBuilt', p.year_built)
    p.energy_rating = prop_data.get('energyRating', p.energy_rating)
    p.orientation = prop_data.get('orientation', p.orientation)
    p.purchase_price = prop_data.get('purchasePrice', p.purchase_price)
    p.total_cost = prop_data.get('totalCost', p.total_cost)
    p.monthly_cost = prop_data.get('monthlyCost', p.monthly_cost)
    p.monthly_income = prop_data.get('monthlyIncome', p.monthly_income)
    p.updated_at = datetime.now()
    save_db()
    return p

@app.delete("/api/user/properties/{property_id}")
async def delete_user_property(property_id: int, current_user: User = Depends(get_current_user)):
    idx = next((i for i, p in enumerate(properties_db) if p.id == property_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    p = properties_db[idx]
    if p.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta propiedad")
    del properties_db[idx]
    save_db()
    return {"message": "Propiedad eliminada con éxito"}

# Endpoints Realtor
@app.get("/api/realtor/dashboard")
async def get_realtor_dashboard(current_user: User = Depends(require_role(["realtor"]))):
    my_properties = [p for p in properties_db if p.realtor_id == current_user.id]
    return {
        "total_properties": len(my_properties),
        "properties_sold": 15,
        "properties_rented": 8,
        "total_commissions": 45000.0,
        "this_month_sales": 3,
        "this_month_rentals": 2,
        "avg_sale_price": sum(p.price for p in my_properties) / len(my_properties) if my_properties else 0,
        "performance_score": 8.7
    }

@app.get("/api/realtor/properties", response_model=List[Property])
async def get_realtor_properties(current_user: User = Depends(require_role(["realtor"]))):
    return [p for p in properties_db if p.realtor_id == current_user.id]

# Endpoints Investor
@app.get("/api/investor/dashboard")
async def get_investor_dashboard(current_user: User = Depends(require_role(["investor"]))):
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

@app.get("/api/investor/portfolio", response_model=List[Investment])
async def get_investor_portfolio(current_user: User = Depends(require_role(["investor"]))):
    # Simular algunas inversiones
    sample_investments = [
        Investment(
            id=1,
            property_id=1,
            investor_id=current_user.id,
            investment_amount=120000.0,
            current_value=145000.0,
            purchase_price=120000.0,
            purchase_date=datetime.now() - timedelta(days=365),
            roi_percentage=20.8,
            annual_rental_income=8400.0,
            rental_yield=7.0,
            appreciation_rate=4.2,
            holding_period_months=12,
            status="active"
        )
    ]
    return sample_investments

# ─── AI Chat Configuration ───────────────────────────────────────────
AI_CONFIG = {
    "enabled": True,
    "provider": "gemini",
    "api_key": os.getenv("GEMINI_API_KEY", ""),
    "model": "gemini-flash-latest",
    "system_prompt": "Eres un asistente inmobiliario experto de Ubica, una plataforma de propiedades en la región de Murcia, España. Ayudas a los usuarios a encontrar propiedades, responder preguntas sobre el mercado inmobiliario y dar consejos de inversión. Responde siempre en español.",
    "max_tokens": 1024,
    "temperature": 0.7,
}

class AIChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest, request_obj: Request, current_user: Optional[User] = Depends(get_user_or_none)):
    """
    Endpoint de chat con IA (Gemini).
    Utiliza el modelo Gemini con Google Search Grounding y Herramientas Locales (MCP).
    """
    
    # 1. Verificar Límites (Freemium)
    user_id = current_user.id if current_user else None
    user_role = current_user.role if current_user else "guest"
    client_ip = request_obj.client.host if request_obj.client else "unknown"
    
    if not check_ai_usage(user_id=user_id, ip=client_ip, role=user_role):
        raise HTTPException(
            status_code=429, 
            detail="Has alcanzado tu límite de consultas gratuitas por hoy. 🚀 ¡Regístrate o actualiza a un plan Premium para seguir consultando!"
        )

    # 1.1 Contexto para las MCP Tools basado en el usuario
    user_ctx = {
        "user_id": user_id,
        "user_role": user_role,
        "user_name": current_user.full_name if current_user else "Invitado"
    }

    # 2. Check if we have Gemini integrated and configured
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        # Fallback to mock mechanism if no real credentials are set
        msg = request.message.lower()
        if "villa" in msg or "chalet" in msg:
            answer = "Tenemos varias villas disponibles en la región de Murcia. ¿Quieres que busque por alguna zona?"
        else:
            answer = "Vaya, parece que la inteligencia artificial (Gemini) no está configurada o falta tu API KEY en el backend."
        return {"message": answer, "provider": "mock", "model": "placeholder"}

    # 3. Handle Gemini Execution
    try:
        # Prepare the MCP tools as callable functions for Gemini
        # We need to wrap them so we can inject the security context implicitly
        async def mcptool_buscar_propiedades(ubicacion: str = "", precio_maximo: float = 0.0, tipo: str = "") -> str:
            """Busca propiedades en la base de datos aplicando filtros."""
            return await buscar_propiedades(ubicacion, precio_maximo, tipo, ctx=user_ctx)

        async def mcptool_obtener_detalles(propiedad_id: int) -> str:
            """Obtiene todos los detalles, descripción y datos de inversión de una propiedad usando su ID."""
            return await obtener_detalles_propiedad(propiedad_id, ctx=user_ctx)

        # Configurar modelo con System Instruction y Tools
        model = genai.GenerativeModel(
            model_name=AI_CONFIG["model"], 
            system_instruction=f"{AI_CONFIG['system_prompt']} El usuario que te habla es: {user_ctx['user_name']}. Rol: {user_ctx['user_role']}. "
                               f"Cuando te pidan información sobre viviendas, debes usar estrictamente las herramientas disponibles para buscar en la base de datos interna respetando sus permisos. "
                               f"Cualquier consulta general inmobiliaria de España o Murcia de la cual no estés seguro debes buscarla en internet.",
            tools=[mcptool_buscar_propiedades, mcptool_obtener_detalles, "google_search_retrieval"]
        )

        # Build Chat History structure exactly as Gemini expects it
        chat_history = []
        for msg in request.history:
            role = "user" if msg.get("role") == "user" else "model"
            chat_history.append({"role": role, "parts": [msg.get("content")]})

        # Empezar sesión de chat
        chat_session = model.start_chat(history=chat_history, enable_automatic_function_calling=True)
        
        # Mandar el nuevo mensaje de forma ASINCRONA
        response = await chat_session.send_message_async(request.message)

        res_text = response.text if response.text else "Estoy procesando tu solicitud, dame un segundo."

        return {
            "message": res_text,
            "provider": "gemini",
            "model": AI_CONFIG["model"]
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Error in Gemini chat: {error_msg}")
        
        # Manejo específico para errores de cuota (429)
        if "429" in error_msg or "ResourceExhausted" in error_msg:
             raise HTTPException(
                status_code=429, 
                detail="Has alcanzado tu límite de consultas gratuitas por hoy. 🚀 ¡Regístrate o actualiza a un plan Premium para seguir consultando!"
            )
            
        raise HTTPException(status_code=500, detail=error_msg)
    
    # ── FUTURO: Descomentar para usar un LLM real ──
    # if AI_CONFIG["provider"] == "openai":
    #     import openai
    #     client = openai.OpenAI(api_key=AI_CONFIG["api_key"])
    #     messages = [{"role": "system", "content": AI_CONFIG["system_prompt"]}]
    #     messages.extend(request.history)
    #     messages.append({"role": "user", "content": request.message})
    #     response = client.chat.completions.create(
    #         model=AI_CONFIG["model"],
    #         messages=messages,
    #         max_tokens=AI_CONFIG["max_tokens"],
    #         temperature=AI_CONFIG["temperature"],
    #     )
    #     return {"message": response.choices[0].message.content, "provider": "openai"}
    
    # ── Respuestas simuladas inteligentes ──
    msg = request.message.lower()
    
    if any(w in msg for w in ["villa", "chalet", "casa grande"]):
        answer = f"Tenemos varias villas disponibles en la region de Murcia. Actualmente hay {len([p for p in properties_db if 'villa' in p.type.lower()])} villas en nuestro catalogo. Te recomiendo explorar las opciones en Cartagena y Mar Menor, donde encontraras propiedades con excelentes vistas y piscina privada. Quieres que te filtre por alguna zona concreta?"
    elif any(w in msg for w in ["apartamento", "piso", "apartment"]):
        answer = f"Disponemos de {len([p for p in properties_db if 'apartamento' in p.type.lower() or 'apartment' in p.type.lower()])} apartamentos en la zona. Las mejores opciones estan en Murcia centro y la costa. Quieres que busque por un rango de precio especifico?"
    elif any(w in msg for w in ["precio", "cuanto", "costar", "economico", "barato", "caro"]):
        prices = [p.price for p in properties_db if p.price > 0]
        avg_price = sum(prices) / len(prices) if prices else 0
        min_price = min(prices) if prices else 0
        max_price = max(prices) if prices else 0
        answer = f"Los precios en nuestra cartera van desde {min_price:,.0f}EUR hasta {max_price:,.0f}EUR, con un precio medio de {avg_price:,.0f}EUR. Puedo ayudarte a encontrar opciones dentro de tu presupuesto. Cual es tu rango de precio?"
    elif any(w in msg for w in ["invertir", "inversion", "roi", "rentabilidad"]):
        answer = "La region de Murcia ofrece excelentes oportunidades de inversion inmobiliaria. El rendimiento medio de alquiler ronda el 7-8% anual, y la apreciacion del mercado ha sido del 5.2% en el ultimo ano. Las zonas costeras como Mar Menor y Cartagena son especialmente atractivas para inversion."
    elif any(w in msg for w in ["alquiler", "alquilar", "rentar", "rent"]):
        answer = "Tenemos propiedades disponibles para alquiler en toda la region de Murcia. Los alquileres varian segun la zona: desde 400EUR/mes en zonas del interior hasta 1.200EUR/mes en primera linea de playa. Que zona te interesa?"
    elif any(w in msg for w in ["zona", "ubicacion", "donde", "barrio", "cartagena", "murcia", "lorca"]):
        cities = list(set(p.city for p in properties_db if p.city))
        answer = f"Trabajamos en las siguientes zonas: {', '.join(cities[:10])}. Cada zona tiene sus ventajas: el centro de Murcia para servicios, Cartagena para playa, y Lorca para precios mas asequibles. Sobre que zona quieres mas informacion?"
    elif any(w in msg for w in ["hola", "buenos", "buenas", "hey", "saludos"]):
        answer = "Hola! Bienvenido al asistente de Ubica. Puedo ayudarte con:\n\n- Buscar propiedades (villas, apartamentos, casas...)\n- Informacion sobre precios y zonas\n- Consejos de inversion inmobiliaria\n- Opciones de alquiler\n\nQue te gustaria saber?"
    elif any(w in msg for w in ["gracias", "thanks", "genial", "perfecto"]):
        answer = "De nada! Estoy aqui para ayudarte. Si tienes mas preguntas sobre propiedades o el mercado inmobiliario de Murcia, no dudes en preguntar."
    else:
        total = len(properties_db)
        answer = f"Interesante pregunta. Actualmente tenemos {total} propiedades en nuestra plataforma cubriendo toda la region de Murcia. Puedo ayudarte a buscar por tipo de propiedad, precio, zona o como inversion. Que aspecto te interesa mas?"
    
    return {
        "message": answer,
        "provider": AI_CONFIG["provider"],
        "model": AI_CONFIG["model"] or "placeholder",
    }

@app.get("/api/ai/config")
async def get_ai_config(current_user: User = Depends(require_role(["admin"]))):
    """Ver la configuracion actual de la IA (solo admin)"""
    return {
        "enabled": AI_CONFIG["enabled"],
        "provider": AI_CONFIG["provider"],
        "model": AI_CONFIG["model"] or "placeholder",
        "has_api_key": bool(AI_CONFIG["api_key"]),
        "max_tokens": AI_CONFIG["max_tokens"],
        "temperature": AI_CONFIG["temperature"],
    }

# --- User Features Endpoints ---

@app.get("/api/user/favorites")
async def get_favorites(current_user: User = Depends(get_current_user)):
    user_favs = [f for f in favorites_db if f.user_id == current_user.id]
    # Optionally return the actual properties joined
    fav_props = [p for p in properties_db if p.id in [f.property_id for f in user_favs]]
    return fav_props

@app.post("/api/user/favorites/{property_id}")
async def add_favorite(property_id: int, current_user: User = Depends(get_current_user)):
    if any(f.property_id == property_id and f.user_id == current_user.id for f in favorites_db):
        return {"message": "Already in favorites"}
    
    new_id = max((f.id for f in favorites_db), default=0) + 1
    new_fav = Favorite(id=new_id, user_id=current_user.id, property_id=property_id)
    favorites_db.append(new_fav)
    save_db()
    return {"message": "Added to favorites", "id": new_id}

@app.delete("/api/user/favorites/{property_id}")
async def remove_favorite(property_id: int, current_user: User = Depends(get_current_user)):
    global favorites_db
    favorites_db = [f for f in favorites_db if not (f.property_id == property_id and f.user_id == current_user.id)]
    save_db()
    return {"message": "Removed from favorites"}

@app.get("/api/user/searches")
async def get_searches(current_user: User = Depends(get_current_user)):
    return [s for s in searches_db if s.user_id == current_user.id]

@app.post("/api/user/searches")
async def add_search(search_data: dict, current_user: User = Depends(get_current_user)):
    new_id = max((s.id for s in searches_db), default=0) + 1
    new_search = SavedSearch(
        id=new_id, 
        user_id=current_user.id, 
        name=search_data.get("name", "Búsqueda Guardada"), 
        filters=json.dumps(search_data.get("filters", {}))
    )
    searches_db.append(new_search)
    save_db()
    return {"message": "Búsqueda guardada", "id": new_id}

@app.delete("/api/user/searches/{search_id}")
async def remove_search(search_id: int, current_user: User = Depends(get_current_user)):
    global searches_db
    searches_db = [s for s in searches_db if not (s.id == search_id and s.user_id == current_user.id)]
    save_db()
    return {"message": "Búsqueda eliminada"}

# --- Mensajes: enviados por el usuario actual ---
@app.get("/api/user/messages")
async def get_messages(current_user: User = Depends(get_current_user)):
    return [m for m in messages_db if m.user_id == current_user.id]

# --- Mensajes: recibidos por el usuario actual (como propietario) ---
@app.get("/api/user/messages/received")
async def get_received_messages(current_user: User = Depends(get_current_user)):
    return [m for m in messages_db if m.receiver_id == current_user.id]

# --- Conversaciones agrupadas por propiedad ---
@app.get("/api/user/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    # Mensajes donde el usuario es emisor o receptor
    my_msgs = [m for m in messages_db if m.user_id == current_user.id or m.receiver_id == current_user.id]
    # Agrupar por property_id + la otra parte
    threads: dict = {}
    for m in my_msgs:
        other_id = m.receiver_id if m.user_id == current_user.id else m.user_id
        key = f"{m.property_id}_{other_id}"
        if key not in threads:
            # Buscar nombre del otro participante
            other_user = next((u for u in users_db if u.id == other_id), None)
            threads[key] = {
                "property_id": m.property_id,
                "property_title": m.property_title or "Propiedad",
                "other_user_id": other_id,
                "other_user_name": other_user.full_name if other_user else "Usuario",
                "messages": [],
                "last_message": None,
                "unread_count": 0,
            }
        msg_dict = m.dict()
        msg_dict["is_mine"] = m.user_id == current_user.id
        msg_dict["created_at"] = m.created_at.isoformat() if isinstance(m.created_at, datetime) else str(m.created_at)
        threads[key]["messages"].append(msg_dict)
        threads[key]["last_message"] = msg_dict
        if not msg_dict["is_mine"] and m.status != "read":
            threads[key]["unread_count"] += 1
    # Ordenar hilos por último mensaje
    result = sorted(threads.values(), key=lambda t: t["last_message"]["created_at"] if t["last_message"] else "", reverse=True)
    return result

# --- Enviar mensaje ---
@app.post("/api/user/messages")
async def add_message(msg_data: dict, current_user: User = Depends(get_current_user)):
    new_id = max((m.id for m in messages_db), default=0) + 1
    
    # Determinar receiver_id: el owner de la propiedad
    receiver_id = msg_data.get("receiver_id")
    property_title = None
    prop_id = msg_data.get("property_id")
    if prop_id:
        prop = next((p for p in properties_db if p.id == prop_id), None)
        if prop:
            property_title = prop.title
            if not receiver_id:
                receiver_id = prop.owner_id
    
    new_msg = Message(
        id=new_id,
        user_id=current_user.id,
        receiver_id=receiver_id,
        property_id=prop_id,
        realtor_id=msg_data.get("realtor_id"),
        sender_name=current_user.full_name or current_user.email,
        property_title=property_title,
        content=msg_data.get("content", ""),
        status="pending"
    )
    messages_db.append(new_msg)
    save_db()
    return {"message": "Mensaje enviado", "id": new_id}

# --- Responder a un mensaje (para el receptor) ---
@app.post("/api/user/messages/{message_id}/reply")
async def reply_message(message_id: int, msg_data: dict, current_user: User = Depends(get_current_user)):
    # Buscar el mensaje original
    original = next((m for m in messages_db if m.id == message_id), None)
    if not original:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    
    new_id = max((m.id for m in messages_db), default=0) + 1
    new_msg = Message(
        id=new_id,
        user_id=current_user.id,
        receiver_id=original.user_id,  # responder al emisor original
        property_id=original.property_id,
        realtor_id=original.realtor_id,
        sender_name=current_user.full_name or current_user.email,
        property_title=original.property_title,
        content=msg_data.get("content", ""),
        status="pending"
    )
    messages_db.append(new_msg)
    
    # Marcar el mensaje original como respondido
    original.status = "replied"
    
    save_db()
    return {"message": "Respuesta enviada", "id": new_id}

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "database": "connected",
        "total_properties": len(properties_db),
        "total_users": len(users_db)
    }

if __name__ == "__main__":
    print("Iniciando Ubica Enterprise Backend...")
    print("Usuarios de prueba disponibles:")
    print("   Admin: admin@amifincas.es / admin123")
    print("   Realtor: inmobiliaria1@amifincas.es / realtor123") 
    print("   Investor: inversor1@amifincas.es / investor123")
    print("API Documentation: http://localhost:8000/docs")
    print("Health Check: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=True
    )
