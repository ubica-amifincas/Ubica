#!/usr/bin/env python3
"""
Ubica Enterprise Backend - API FastAPI.
Configuración en config.py, endpoints en routers/ y lógica compartida en services/.
"""
import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime

import aiohttp
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.routing import Route

import mcp_server
from config import CORS_ORIGIN_REGEX, CORS_ORIGINS, UPLOAD_DIR
from database import ensure_columns, ensure_tables
from routers import admin, ai, auth, contact, games, health, investor, portfolio, properties, realtor, social, uploads, user
from services import instagram
from services.ai.chat import log_provider_status
from services.ai.usage import load_ai_usage

@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_tables()
    ensure_columns()
    # Solo en background
    asyncio.create_task(render_keep_alive())
    asyncio.create_task(instagram_token_refresher())
    # Comprueba que OpenRouter y Groq responden y lo deja en el log (en Render)
    if os.getenv("RENDER"):
        asyncio.create_task(log_provider_status())
    # Servidor MCP para los agentes de IA de los clientes (mcp_server.py), en /mcp
    async with mcp_server.mcp_app.running():
        yield


# Inicializar FastAPI
app = FastAPI(
    lifespan=lifespan,
    title="Ubica Enterprise API",
    description="API completa para plataforma inmobiliaria enterprise",
    version="1.0.0",
    # En producción no se publica el mapa de la API (no es secreto, pero tampoco hace falta dárselo hecho a nadie)
    docs_url=None if os.getenv("RENDER") else "/docs",
    redoc_url=None if os.getenv("RENDER") else "/redoc",
    openapi_url=None if os.getenv("RENDER") else "/openapi.json"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def instagram_token_refresher():
    """Renueva el token de Instagram antes de que caduque (mira una vez al día si toca)."""
    while True:
        try:
            await instagram.refresh_token_if_due()
        except Exception as e:
            print(f"[Instagram] No se pudo renovar el token: {e}")
        await asyncio.sleep(24 * 60 * 60)


# --- Keep-Alive Task ---

async def render_keep_alive():
    """Background task to ping the service itself to prevent Render free tier spin down"""
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    
    # Si no hay URL de Render, probamos con el localhost solo para logging en dev
    ping_url = f"{render_url}/api/ping" if render_url else "http://localhost:8000/api/ping"
    print(f"Starting keep-alive task pinging {ping_url} every 14 minutes.")
    
    async with aiohttp.ClientSession() as session:
        while True:
            await asyncio.sleep(14 * 60) # 14 minutes
            try:
                async with session.get(ping_url) as response:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Keep-alive ping sent. Status: {response.status}")
            except Exception as e:
                print(f"Keep-alive ping failed: {e}")


# Configurar directorio de uploads
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

for module in (auth, uploads, properties, admin, user, games, realtor, investor, portfolio, ai, contact, social, health):
    app.include_router(module.router)
for mcp_path in ("/mcp", "/mcp/"):
    app.router.routes.append(Route(mcp_path, mcp_server.mcp_app, methods=["GET", "POST", "DELETE"]))

# Cargar el contador de uso de IA al inicio
load_ai_usage()

if __name__ == "__main__":
    print("API Documentation: http://localhost:8000/docs")
    print("Health Check: http://localhost:8000/health")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        access_log=True
    )
