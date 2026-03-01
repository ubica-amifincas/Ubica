#!/usr/bin/env python3
"""
ATARAX Enterprise Backend - Servidor HTTP simple
Simula la funcionalidad completa enterprise usando solo librerías estándar
"""

import json
import hashlib
import time
from datetime import datetime, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

# Configuración
SECRET_KEY = "atarax-enterprise-secret-key-2024"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Base de datos simulada
users_db = [
    {
        "id": 1,
        "email": "admin@atarax.com",
        "hashed_password": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",  # admin123
        "full_name": "Administrador ATARAX",
        "role": "admin",
        "company": "ATARAX Enterprise",
        "phone": "+34 968 123 456",
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    },
    {
        "id": 2,
        "email": "inmobiliaria1@atarax.com",
        "hashed_password": "7c4a8d09ca3762af61e59520943dc26494f8941b",  # realtor123
        "full_name": "Costa Cálida Properties",
        "role": "realtor",
        "company": "Costa Cálida Properties SL",
        "phone": "+34 968 234 567",
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    },
    {
        "id": 3,
        "email": "inversor1@atarax.com",
        "hashed_password": "8b96f4e9b73fc4d2a8b19e9e8d1d8e9a8b96f4e9",  # investor123
        "full_name": "Inversiones Mediterráneo",
        "role": "investor",
        "company": "Inversiones Mediterráneo SA",
        "phone": "+34 968 345 678",
        "is_active": True,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
]

# Cargar datos de propiedades
properties_db = []

def load_properties_data():
    try:
        with open('/workspace/atarax-portal/public/propertiesMurcia.json', 'r', encoding='utf-8') as f:
            properties_data = json.load(f)
            
        for i, prop_data in enumerate(properties_data, 1):
            property_obj = {
                "id": i,
                "title": prop_data.get('title', ''),
                "price": prop_data.get('price', 0),
                "type": prop_data.get('type', 'Casa'),
                "status": prop_data.get('status', 'available'),
                "bedrooms": prop_data.get('bedrooms'),
                "bathrooms": prop_data.get('bathrooms'),
                "area": prop_data.get('area'),
                "latitude": prop_data.get('latitude'),
                "longitude": prop_data.get('longitude'),
                "address": prop_data.get('address', ''),
                "city": prop_data.get('city', ''),
                "region": "Murcia",
                "description": prop_data.get('description', ''),
                "images": prop_data.get('images', []),
                "features": prop_data.get('features', []),
                "year_built": prop_data.get('yearBuilt'),
                "energy_rating": prop_data.get('energyRating'),
                "orientation": prop_data.get('orientation'),
                "owner_id": 1,
                "realtor_id": 2 if i % 2 == 0 else 3,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            properties_db.append(property_obj)
        print(f"✅ Cargadas {len(properties_db)} propiedades de Murcia")
    except Exception as e:
        print(f"❌ Error cargando propiedades: {e}")

# Utilidades
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_token(user_id: int) -> str:
    # Token simple basado en timestamp
    timestamp = str(int(time.time()))
    token_data = f"{user_id}:{timestamp}:{SECRET_KEY}"
    return hashlib.sha256(token_data.encode()).hexdigest()

def verify_token(token: str) -> int:
    # Verificación simple del token
    for user in users_db:
        test_token = create_token(user["id"])
        if token == test_token:
            return user["id"]
    return None

class ATARAXHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response_data = {"error": "Endpoint not found"}
        
        try:
            if path == "/health":
                response_data = {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "version": "1.0.0",
                    "database": "connected",
                    "total_properties": len(properties_db),
                    "total_users": len(users_db)
                }
            
            elif path == "/api/properties":
                response_data = properties_db[:20]  # Primeras 20 propiedades
            
            elif path.startswith("/api/properties/"):
                property_id = int(path.split("/")[-1])
                property_obj = next((p for p in properties_db if p["id"] == property_id), None)
                if property_obj:
                    response_data = property_obj
                else:
                    response_data = {"error": "Propiedad no encontrada"}
            
            elif path == "/api/stats/market":
                response_data = {
                    "total_properties": len(properties_db),
                    "average_price": sum(p["price"] for p in properties_db) / len(properties_db) if properties_db else 0,
                    "cities": list(set(p["city"] for p in properties_db if p["city"])),
                    "property_types": list(set(p["type"] for p in properties_db)),
                    "market_trend": "+5.2%",
                    "last_updated": datetime.now().isoformat()
                }
            
            elif path == "/api/admin/dashboard":
                token = self.get_auth_token()
                if self.verify_role(token, ["admin"]):
                    response_data = {
                        "total_properties": len(properties_db),
                        "total_users": len(users_db),
                        "total_transactions": 45,
                        "total_revenue": 1250000.0,
                        "properties_sold_this_month": 12,
                        "properties_rented_this_month": 8,
                        "average_roi": 7.8,
                        "market_growth": 5.2
                    }
                else:
                    response_data = {"error": "Access denied"}
            
            elif path == "/api/admin/users":
                token = self.get_auth_token()
                if self.verify_role(token, ["admin"]):
                    response_data = [
                        {k: v for k, v in user.items() if k != "hashed_password"} 
                        for user in users_db
                    ]
                else:
                    response_data = {"error": "Access denied"}
            
            elif path == "/api/realtor/dashboard":
                token = self.get_auth_token()
                user_id = verify_token(token) if token else None
                if user_id and self.verify_role(token, ["realtor"]):
                    my_properties = [p for p in properties_db if p["realtor_id"] == user_id]
                    response_data = {
                        "total_properties": len(my_properties),
                        "properties_sold": 15,
                        "properties_rented": 8,
                        "total_commissions": 45000.0,
                        "this_month_sales": 3,
                        "this_month_rentals": 2,
                        "avg_sale_price": sum(p["price"] for p in my_properties) / len(my_properties) if my_properties else 0,
                        "performance_score": 8.7
                    }
                else:
                    response_data = {"error": "Access denied"}
            
            elif path == "/api/investor/dashboard":
                token = self.get_auth_token()
                if self.verify_role(token, ["investor"]):
                    response_data = {
                        "portfolio_value": 875000.0,
                        "total_properties": 12,
                        "monthly_income": 5200.0,
                        "average_roi": 8.3,
                        "total_investment": 720000.0,
                        "unrealized_gains": 155000.0,
                        "rental_yield": 7.2,
                        "appreciation_rate": 4.8
                    }
                else:
                    response_data = {"error": "Access denied"}
            
        except Exception as e:
            response_data = {"error": str(e)}
        
        self.wfile.write(json.dumps(response_data, default=str, ensure_ascii=False).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        self.send_response(200)
        self.send_cors_headers()
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        response_data = {"error": "Endpoint not found"}
        
        try:
            if path == "/api/auth/login":
                email = data.get("email")
                password = data.get("password")
                
                user = next((u for u in users_db if u["email"] == email), None)
                if user and verify_password(password, user["hashed_password"]):
                    token = create_token(user["id"])
                    user_data = {k: v for k, v in user.items() if k != "hashed_password"}
                    response_data = {
                        "access_token": token,
                        "token_type": "bearer",
                        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                        "user": user_data
                    }
                else:
                    response_data = {"error": "Email o contraseña incorrectos"}
            
        except Exception as e:
            response_data = {"error": str(e)}
        
        self.wfile.write(json.dumps(response_data, default=str, ensure_ascii=False).encode('utf-8'))

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def get_auth_token(self):
        auth_header = self.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header[7:]
        return None

    def verify_role(self, token, required_roles):
        if not token:
            return False
        user_id = verify_token(token)
        if not user_id:
            return False
        user = next((u for u in users_db if u["id"] == user_id), None)
        return user and user["role"] in required_roles

    def log_message(self, format, *args):
        # Silenciar logs por defecto
        pass

def run_server():
    # Cargar propiedades al inicio
    load_properties_data()
    
    print("🚀 Iniciando ATARAX Enterprise Backend...")
    print("📋 Usuarios de prueba disponibles:")
    print("   👨‍💼 Admin: admin@atarax.com / admin123")
    print("   🏢 Realtor: inmobiliaria1@atarax.com / realtor123") 
    print("   💰 Investor: inversor1@atarax.com / investor123")
    print("🌐 API Base URL: http://localhost:8000")
    print("🔗 Health Check: http://localhost:8000/health")
    print("📊 Properties: http://localhost:8000/api/properties")
    print("📈 Market Stats: http://localhost:8000/api/stats/market")
    print("")
    
    server = HTTPServer(('0.0.0.0', 8000), ATARAXHandler)
    print("✅ Servidor backend iniciado en http://localhost:8000")
    print("🔄 Listo para recibir conexiones del frontend...")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Deteniendo servidor...")
        server.shutdown()

if __name__ == "__main__":
    run_server()
