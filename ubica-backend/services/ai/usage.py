"""Límite diario de consultas al chat de IA (por usuario o por IP), guardado en un JSON."""
import json
import os
from datetime import datetime
from typing import Optional

from config import AI_USAGE_FILE

ai_usage_db = {}

def load_ai_usage():
    global ai_usage_db
    ai_usage_db = {}
    if os.path.exists(AI_USAGE_FILE):
        try:
            with open(AI_USAGE_FILE, "r", encoding="utf-8") as f:
                ai_usage_db = json.load(f)
        except:
            ai_usage_db = {}

def save_ai_usage():
    with open(AI_USAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(ai_usage_db, f, indent=2)

def check_ai_usage(user_id: Optional[int] = None, ip: str = "unknown", role: str = "guest"):
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Re-cargar para sincronía simple si varios hilos corren (aunque uvicorn reload=True es single worker por defecto)
    load_ai_usage()
    
    # Inicializar datos del día si no existen
    if today not in ai_usage_db:
        ai_usage_db[today] = {"users": {}, "ips": {}}
        save_ai_usage()
    
    # Solo los administradores no tienen límite: cualquiera puede registrarse como realtor o investor
    if role == "admin":
        return True
        
    limit = 30 if user_id else 15


    
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
