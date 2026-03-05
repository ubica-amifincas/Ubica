import json
from datetime import datetime
from mcp.server.fastmcp import FastMCP
from typing import Optional

# Setup MCP server
mcp_server = FastMCP("ubica-mcp")

from sqlmodel import Session, select, or_
from database import engine
import models

# --- Filter Helper (Database version) ---
def get_allowed_properties_statement(user_id: Optional[int], user_role: Optional[str]):
    """
    Returns a SQLModel statement for properties based on the user's role and ID.
    - None (Guest): Only sees 'public/available' properties.
    - Professional roles: See everything for now or specific ones.
    - 'admin': Sees everything.
    """
    if user_role == "admin":
        return select(models.Property)
        
    # Public statuses
    public_statuses = ["available", "for-sale", "for-rent"]
    
    if user_id is None:
        return select(models.Property).where(models.Property.status.in_(public_statuses))
        
    # Authenticated user: sees public + their own
    return select(models.Property).where(
        or_(
            models.Property.status.in_(public_statuses),
            models.Property.owner_id == user_id,
            models.Property.realtor_id == user_id
        )
    )

# --- MCP Tools ---

@mcp_server.tool()
async def buscar_propiedades(
    ubicacion: str = "", 
    precio_maximo: float = 0.0, 
    tipo: str = "",
    estado: str = "",
    ctx: dict = None
) -> str:
    """Busca propiedades en la base de datos de Ubica aplicando filtros. Retorna una lista en formato JSON."""
    user_id = ctx.get("user_id") if ctx else None
    user_role = ctx.get("user_role") if ctx else None
    
    with Session(engine) as session:
        statement = get_allowed_properties_statement(user_id, user_role)
        
        # Apply additional filters
        if ubicacion:
            statement = statement.where(
                or_(
                    models.Property.city.ilike(f"%{ubicacion}%"),
                    models.Property.address.ilike(f"%{ubicacion}%"),
                    models.Property.title.ilike(f"%{ubicacion}%")
                )
            )
        if precio_maximo > 0:
            statement = statement.where(models.Property.price <= precio_maximo)
        if tipo:
            statement = statement.where(models.Property.type.ilike(f"%{tipo}%"))
        if estado:
            statement = statement.where(models.Property.status.ilike(f"%{estado}%"))
            
        # Limit results
        statement = statement.limit(15)
        properties = session.exec(statement).all()
        
        results = []
        for p in properties:
            results.append({
                "id": p.id,
                "titulo": p.title,
                "precio": p.price,
                "ubicacion": p.city,
                "tipo": p.type,
                "habitaciones": p.bedrooms,
                "area": p.area,
                "estado": p.status
            })
            
        return json.dumps(results, ensure_ascii=False)


@mcp_server.tool()
async def obtener_detalles_propiedad(
    propiedad_id: int,
    ctx: dict = None
) -> str:
    """Obtiene todos los detalles, descripción y datos de inversión de una propiedad específica por su ID."""
    user_id = ctx.get("user_id") if ctx else None
    user_role = ctx.get("user_role") if ctx else None
    
    with Session(engine) as session:
        # Check if the property exists and is accessible
        p = session.get(models.Property, propiedad_id)
        if not p:
             return json.dumps({"error": f"No se encontró la propiedad con ID {propiedad_id}"})
             
        # Permission check
        public_statuses = ["available", "for-sale", "for-rent"]
        is_accessible = (
            user_role == "admin" or
            p.status in public_statuses or
            (user_id is not None and (p.owner_id == user_id or p.realtor_id == user_id))
        )
        
        if is_accessible:
            return json.dumps(p.model_dump(), default=str, ensure_ascii=False)
            
    return json.dumps({"error": "No tienes permisos para ver esta propiedad."})
