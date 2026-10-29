"""Configuración leída de variables de entorno (.env en local, Environment en Render)."""
import os
import secrets

from dotenv import load_dotenv

load_dotenv()

# Proveedores de IA
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
# Los proveedores retiran modelos: se pueden cambiar desde Render sin desplegar código
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-3.1-flash-lite")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

# Configuración JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    if os.getenv("RENDER"):
        raise RuntimeError("Falta la variable de entorno JWT_SECRET_KEY")
    # En local se genera una al arrancar: las sesiones caducan al reiniciar el backend
    SECRET_KEY = secrets.token_urlsafe(48)
    print("WARNING: JWT_SECRET_KEY no definida, usando una clave temporal.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Configuración de Resend (API en lugar de SMTP)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_SENDER = os.getenv("RESEND_SENDER", "onboarding@resend.dev") # Cambiar a no-reply@amifincas.es tras verificar dominio

# Buzón que recibe el formulario de contacto
CONTACT_EMAIL = os.getenv("CONTACT_EMAIL", "info@amifincas.es")

# URL pública del frontend (enlaces de verificación)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://ubica.amifincas.es",
    "https://amifincas.es",
    "https://www.amifincas.es",
    "https://ubica-five.vercel.app"
]
# Vistas previas de Vercel de este proyecto (ramas como develop), que usan la API de producción
CORS_ORIGIN_REGEX = r"https://ubica-[a-z0-9-]+-verifyubica-7020s-projects\.vercel\.app"

UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"))
AI_USAGE_FILE = os.getenv("AI_USAGE_FILE", "ai_usage.json")

# URL pública del backend para las imágenes guardadas en disco (Render define RENDER_EXTERNAL_URL)
BACKEND_PUBLIC_URL = os.getenv("BACKEND_PUBLIC_URL") or os.getenv("RENDER_EXTERNAL_URL")
# El disco de Render se borra en cada despliegue: con estas variables las imágenes van a Supabase Storage
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "property-images")
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
