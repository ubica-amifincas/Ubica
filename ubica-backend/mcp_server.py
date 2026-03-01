import json
from datetime import datetime
from mcp.server.fastmcp import FastMCP
from typing import Optional

# Setup MCP server
mcp_server = FastMCP("ubica-mcp")

# --- Helper functions (same logic as main.py) ---
def get_properties_sync():
    try:
        with open("properties.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def filter_properties(properties, user_id: Optional[int], user_role: Optional[str]):
    """
    Filter properties based on the user's role and ID.
    - None (Guest): Only sees 'public/available' properties.
    - 'user': Sees public properties + their own.
    - 'realtor': Sees public + their own.
    - 'investor': Sees public + their own.
    - 'admin': Sees everything.
    """
    if user_role == "admin":
        return properties
        
    filtered = []
    for p in properties:
        # Everyone sees available ones
        if p.get("status") == "available":
            filtered.append(p)
            continue
            
        # If authenticated, they also see their own properties
        if user_id is not None:
            if p.get("owner_id") == user_id or p.get("realtor_id") == user_id:
                filtered.append(p)
                
    # Remove duplicates if any
    unique_props = []
    seen_ids = set()
    for p in filtered:
        if p["id"] not in seen_ids:
            seen_ids.add(p["id"])
            unique_props.append(p)
            
    return unique_props

# --- MCP Tools ---

@mcp_server.tool()
async def buscar_propiedades(
    ubicacion: str = "", 
    precio_maximo: float = 0.0, 
    tipo: str = "",
    ctx: dict = None
) -> str:
    """Busca propiedades en la base de datos de Ubica aplicando filtros. Retorna una lista en formato JSON."""
    user_id = ctx.get("user_id") if ctx else None
    user_role = ctx.get("user_role") if ctx else None
    
    properties = get_properties_sync()
    allowed_props = filter_properties(properties, user_id, user_role)
    
    results = []
    for p in allowed_props:
        if ubicacion and ubicacion.lower() not in p.get("location", "").lower() and ubicacion.lower() not in p.get("address", "").lower():
            continue
        if precio_maximo > 0 and p.get("price", 0) > precio_maximo:
            continue
        if tipo and tipo.lower() != p.get("type", "").lower():
            continue
        
        results.append({
            "id": p.get("id"),
            "titulo": p.get("title"),
            "precio": p.get("price"),
            "ubicacion": p.get("location"),
            "tipo": p.get("type"),
            "habitaciones": p.get("bedrooms"),
            "area": p.get("area"),
            "estado": p.get("status")
        })
        
    return json.dumps(results[:15], ensure_ascii=False) # Limit to 15 results to not overflow the LLM prompt


@mcp_server.tool()
async def obtener_detalles_propiedad(
    propiedad_id: int,
    ctx: dict = None
) -> str:
    """Obtiene todos los detalles, descripción y datos de inversión de una propiedad específica por su ID."""
    user_id = ctx.get("user_id") if ctx else None
    user_role = ctx.get("user_role") if ctx else None
    
    properties = get_properties_sync()
    allowed_props = filter_properties(properties, user_id, user_role)
    
    for p in allowed_props:
        if p.get("id") == propiedad_id:
            return json.dumps(p, ensure_ascii=False)
            
    return json.dumps({"error": f"No se encontró la propiedad con ID {propiedad_id} o no tienes permisos para verla."})
