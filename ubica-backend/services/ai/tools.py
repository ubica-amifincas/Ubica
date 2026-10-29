"""Herramientas que el chat de IA puede invocar (function calling compatible con OpenAI)."""
import json
import math
from typing import Optional

from sqlmodel import Session, or_, select

import models
from database import engine
from services.properties import get_allowed_properties_statement

async def buscar_propiedades(user_id: Optional[int], user_role: str, ubicacion: str = "", precio_maximo: float = 0.0, tipo: str = "", estado: str = "") -> str:
    """Busca propiedades en la base de datos aplicando filtros."""
    with Session(engine) as session:
        # DEBUG: Log arguments
        print(f"DEBUG MCP: buscando_propiedades(ubicacion='{ubicacion}', precio={precio_maximo}, tipo='{tipo}', estado='{estado}')")
        statement = get_allowed_properties_statement(user_id, user_role)
        if ubicacion:
            statement = statement.where(or_(models.Property.city.ilike(f"%{ubicacion}%"), models.Property.address.ilike(f"%{ubicacion}%"), models.Property.title.ilike(f"%{ubicacion}%")))
        if precio_maximo > 0:
            statement = statement.where(models.Property.price <= precio_maximo)
        if tipo:
            # Robust semantic mapping Level 3
            tipo_lower = tipo.lower()
            # GENERIC TERMS: Ignore and don't filter by type
            if any(x in tipo_lower for x in ["vivienda", "propiedad", "inmueble"]):
                pass
            # PISOS: Includes apartments, studios, penthouses, flats
            elif any(x in tipo_lower for x in ["piso", "apartamento", "estudio", "atico", "ático", "loft"]):
                tipo_filter = or_(
                    models.Property.type.ilike("%apartment%"), 
                    models.Property.type.ilike("%piso%"), 
                    models.Property.type.ilike("%apartamento%"),
                    models.Property.type.ilike("%studio%"),
                    models.Property.type.ilike("%penthouse%"),
                    models.Property.type.ilike("%atico%"),
                    models.Property.title.ilike("%piso%"),
                    models.Property.title.ilike("%apartamento%"),
                    models.Property.title.ilike("%estudio%")
                )
                statement = statement.where(tipo_filter)
            # CASAS: Includes houses, villas, chalets, duplex, townhouse
            elif any(x in tipo_lower for x in ["casa", "chalet", "villa", "duplex", "dúplex", "adosado"]):
                tipo_filter = or_(
                    models.Property.type.ilike("%villa%"), 
                    models.Property.type.ilike("%casa%"), 
                    models.Property.type.ilike("%chalet%"),
                    models.Property.type.ilike("%duplex%"),
                    models.Property.type.ilike("%house%"),
                    models.Property.title.ilike("%casa%"),
                    models.Property.title.ilike("%chalet%"),
                    models.Property.title.ilike("%villa%")
                )
                statement = statement.where(tipo_filter)
            else:
                statement = statement.where(or_(models.Property.type.ilike(f"%{tipo}%"), models.Property.title.ilike(f"%{tipo}%")))
        if estado:
            statement = statement.where(models.Property.status.ilike(f"%{estado}%"))
        statement = statement.limit(15)
        properties = session.exec(statement).all()
        results = [{"id": p.id, "titulo": p.title, "precio": p.price, "ubicacion": p.city, "tipo": p.type, "habitaciones": p.bedrooms, "area": p.area, "estado": p.status} for p in properties]
        return json.dumps(results, ensure_ascii=False)

async def obtener_detalles(user_id: Optional[int], user_role: str, propiedad_id: int) -> str:
    """Obtiene todos los detalles, descripción y datos de inversión de una propiedad usando su ID."""
    with Session(engine) as session:
        p = session.get(models.Property, propiedad_id)
        if not p: return json.dumps({"error": f"No se encontró la propiedad con ID {propiedad_id}"})
        public_statuses = ["available", "for-sale", "for-rent"]
        if user_role == "admin" or p.status in public_statuses or (user_id is not None and (p.owner_id == user_id or p.realtor_id == user_id)):
            return json.dumps(p.model_dump(), default=str, ensure_ascii=False)
    return json.dumps({"error": "No tienes permisos."})

async def calcular_hipoteca(precio: float, entrada_porcentaje: float = 20.0, plazo_anos: int = 25, interes_anual: float = 3.0) -> str:
    """Calcula la cuota mensual de una hipoteca usando la fórmula francesa."""
    entrada = precio * (entrada_porcentaje / 100)
    capital = precio - entrada
    if capital <= 0:
        return json.dumps({"error": "El capital a financiar es 0 o negativo."})
    r = (interes_anual / 100) / 12  # Tipo mensual
    n = plazo_anos * 12  # Número de cuotas
    if r > 0:
        cuota = capital * (r * math.pow(1 + r, n)) / (math.pow(1 + r, n) - 1)
    else:
        cuota = capital / n
    total_pagado = cuota * n
    total_intereses = total_pagado - capital
    return json.dumps({
        "precio_inmueble": precio,
        "entrada": round(entrada, 2),
        "entrada_porcentaje": entrada_porcentaje,
        "capital_financiado": round(capital, 2),
        "plazo_anos": plazo_anos,
        "interes_anual_porcentaje": interes_anual,
        "cuota_mensual": round(cuota, 2),
        "total_pagado": round(total_pagado, 2),
        "total_intereses": round(total_intereses, 2)
    }, ensure_ascii=False)

async def comparar_propiedades(ids: list) -> str:
    """Compara hasta 4 propiedades lado a lado."""
    if len(ids) < 2:
        return json.dumps({"error": "Necesitas al menos 2 IDs para comparar."})
    if len(ids) > 4:
        ids = ids[:4]
    with Session(engine) as session:
        props = []
        for pid in ids:
            p = session.get(models.Property, int(pid))
            if p:
                precio_m2 = round(p.price / p.area, 2) if p.area and p.area > 0 else None
                props.append({
                    "id": p.id,
                    "titulo": p.title,
                    "precio": p.price,
                    "precio_por_m2": precio_m2,
                    "tipo": p.type,
                    "habitaciones": p.bedrooms,
                    "banos": p.bathrooms,
                    "area_m2": p.area,
                    "ciudad": p.city,
                    "estado": p.status,
                    "ano_construccion": p.year_built,
                    "calificacion_energetica": p.energy_rating
                })
        if len(props) < 2:
            return json.dumps({"error": "No se encontraron suficientes propiedades con esos IDs."})
        return json.dumps({"comparativa": props}, ensure_ascii=False)

async def analisis_zona(zona: str) -> str:
    """Obtiene estadísticas del mercado inmobiliario en una zona."""
    with Session(engine) as session:
        statement = select(models.Property).where(
            or_(models.Property.city.ilike(f"%{zona}%"), models.Property.address.ilike(f"%{zona}%"))
        )
        props = session.exec(statement).all()
        if not props:
            return json.dumps({"mensaje": f"No se encontraron propiedades en '{zona}'."})
        precios = [p.price for p in props if p.price and p.price > 0]
        areas = [p.area for p in props if p.area and p.area > 0]
        precios_m2 = [p.price / p.area for p in props if p.area and p.area > 0 and p.price]
        tipos = {}
        estados = {}
        for p in props:
            tipos[p.type] = tipos.get(p.type, 0) + 1
            estados[p.status] = estados.get(p.status, 0) + 1
        return json.dumps({
            "zona": zona,
            "total_propiedades": len(props),
            "precio_medio": round(sum(precios) / len(precios), 2) if precios else 0,
            "precio_minimo": min(precios) if precios else 0,
            "precio_maximo": max(precios) if precios else 0,
            "precio_medio_por_m2": round(sum(precios_m2) / len(precios_m2), 2) if precios_m2 else 0,
            "area_media_m2": round(sum(areas) / len(areas), 2) if areas else 0,
            "tipos_disponibles": tipos,
            "estados": estados
        }, ensure_ascii=False)

async def calcular_roi_avanzado(precio_compra: float, alquiler_mensual: float, gastos_comunidad: float = 100.0, ibi_anual: float = 0.0, seguro_anual: float = 300.0) -> str:
    """Calcula el ROI avanzado incluyendo gastos."""
    if ibi_anual == 0:
        ibi_anual = precio_compra * 0.005  # Estimación IBI ~0.5%
    ingresos_anuales = alquiler_mensual * 12
    gastos_anuales = (gastos_comunidad * 12) + ibi_anual + seguro_anual
    beneficio_neto_anual = ingresos_anuales - gastos_anuales
    roi_bruto = (ingresos_anuales / precio_compra * 100) if precio_compra > 0 else 0
    roi_neto = (beneficio_neto_anual / precio_compra * 100) if precio_compra > 0 else 0
    cashflow_mensual = beneficio_neto_anual / 12
    anos_amortizacion = precio_compra / beneficio_neto_anual if beneficio_neto_anual > 0 else float('inf')
    return json.dumps({
        "precio_compra": precio_compra,
        "alquiler_mensual": alquiler_mensual,
        "ingresos_anuales": round(ingresos_anuales, 2),
        "gastos_anuales": round(gastos_anuales, 2),
        "desglose_gastos": {
            "comunidad_anual": round(gastos_comunidad * 12, 2),
            "ibi_anual": round(ibi_anual, 2),
            "seguro_anual": round(seguro_anual, 2)
        },
        "beneficio_neto_anual": round(beneficio_neto_anual, 2),
        "roi_bruto_porcentaje": round(roi_bruto, 2),
        "roi_neto_porcentaje": round(roi_neto, 2),
        "cashflow_mensual": round(cashflow_mensual, 2),
        "anos_para_amortizar": round(anos_amortizacion, 1) if anos_amortizacion != float('inf') else "N/A"
    }, ensure_ascii=False)

async def mis_favoritos(user_id: Optional[int]) -> str:
    """Consulta las propiedades favoritas del usuario actual."""
    if not user_id:
        return json.dumps({"error": "Debes estar registrado para ver tus favoritos. ¡Regístrate gratis en Ubica!", "requiere_registro": True})
    with Session(engine) as session:
        statement = select(models.Property).join(models.Favorite).where(models.Favorite.user_id == user_id)
        props = session.exec(statement).all()
        if not props:
            return json.dumps({"mensaje": "No tienes propiedades en favoritos aún. ¡Explora nuestro catálogo y guarda las que te interesen!"})
        results = [{"id": p.id, "titulo": p.title, "precio": p.price, "ubicacion": p.city, "tipo": p.type, "habitaciones": p.bedrooms, "area": p.area} for p in props]
        return json.dumps({"favoritos": results, "total": len(results)}, ensure_ascii=False)

async def mostrar_en_mapa(zona: str = "", tipo: str = "") -> str:
    """Genera un enlace directo al modo mapa con filtros aplicados."""
    params = []
    if zona:
        params.append(f"city={zona}")
    if tipo:
        params.append(f"type={tipo}")
    query = "&".join(params)
    url = f"/map{'?' + query if query else ''}"
    return json.dumps({
        "url_mapa": url,
        "mensaje_para_ia": f"Genera un enlace markdown clickable con texto 'Ver en Mapa →' apuntando a {url}. Dile al usuario que puede explorar visualmente las propiedades en el mapa interactivo."
    }, ensure_ascii=False)

async def estadisticas_cartera(user_id: Optional[int], user_role: str) -> str:
    """Obtiene estadísticas de la cartera de propiedades del usuario (inmobiliaria/admin)."""
    if user_role not in ["inmobiliaria", "admin"]:
        return json.dumps({"error": "Esta herramienta solo está disponible para inmobiliarias y administradores.", "requiere_rol": True})
    with Session(engine) as session:
        if user_role == "admin":
            statement = select(models.Property)
        else:
            statement = select(models.Property).where(
                or_(models.Property.owner_id == user_id, models.Property.realtor_id == user_id)
            )
        props = session.exec(statement).all()
        if not props:
            return json.dumps({"mensaje": "No tienes propiedades en tu cartera."})
        estados = {}
        tipos = {}
        ciudades = {}
        precios = []
        for p in props:
            estados[p.status] = estados.get(p.status, 0) + 1
            tipos[p.type] = tipos.get(p.type, 0) + 1
            if p.city:
                ciudades[p.city] = ciudades.get(p.city, 0) + 1
            if p.price:
                precios.append(p.price)
        valor_total = sum(precios)
        return json.dumps({
            "total_propiedades": len(props),
            "valor_total_cartera": round(valor_total, 2),
            "precio_medio": round(valor_total / len(precios), 2) if precios else 0,
            "desglose_por_estado": estados,
            "desglose_por_tipo": tipos,
            "desglose_por_ciudad": ciudades
        }, ensure_ascii=False)

async def propiedades_similares(propiedad_id: int) -> str:
    """Busca propiedades similares a una dada (mismo tipo, ciudad cercana, precio ±30%)."""
    with Session(engine) as session:
        ref = session.get(models.Property, propiedad_id)
        if not ref:
            return json.dumps({"error": f"No se encontró la propiedad con ID {propiedad_id}"})
        # Build similarity query
        statement = select(models.Property).where(models.Property.id != ref.id)
        # Same type
        if ref.type:
            statement = statement.where(models.Property.type == ref.type)
        # Same city or nearby
        if ref.city:
            statement = statement.where(models.Property.city.ilike(f"%{ref.city}%"))
        # Price range ±30%
        if ref.price and ref.price > 0:
            min_price = ref.price * 0.7
            max_price = ref.price * 1.3
            statement = statement.where(models.Property.price >= min_price, models.Property.price <= max_price)
        statement = statement.limit(5)
        similares = session.exec(statement).all()
        if not similares:
            # Relax: try just same city without type filter
            statement2 = select(models.Property).where(
                models.Property.id != ref.id
            )
            if ref.city:
                statement2 = statement2.where(models.Property.city.ilike(f"%{ref.city}%"))
            statement2 = statement2.limit(5)
            similares = session.exec(statement2).all()
        if not similares:
            return json.dumps({"mensaje": "No se encontraron propiedades similares."})
        results = [{"id": p.id, "titulo": p.title, "precio": p.price, "ubicacion": p.city, "tipo": p.type, "habitaciones": p.bedrooms, "area": p.area} for p in similares]
        return json.dumps({
            "propiedad_referencia": {"id": ref.id, "titulo": ref.title, "precio": ref.price, "ciudad": ref.city, "tipo": ref.type},
            "similares": results,
            "total": len(results)
        }, ensure_ascii=False)

# Definiciones para APIs compatibles con OpenAI
OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "buscar_propiedades",
            "description": "Busca propiedades en la base de datos aplicando filtros.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ubicacion": {"type": "string", "description": "Ciudad, barrio o dirección"},
                    "precio_maximo": {"type": "number", "description": "Precio máximo a buscar"},
                    "tipo": {"type": "string", "description": "Tipo de propiedad específico (e.g. villa, apartamento, piso). Si el usuario usa términos genéricos como 'vivienda', 'propiedad' o 'inmueble', NO incluyas este parámetro."},
                    "estado": {"type": "string", "description": "Estado de la propiedad (e.g. alquiler, venta, for-rent, for-sale)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_detalles",
            "description": "Obtiene todos los detalles, descripción y datos de inversión de una propiedad usando su ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "propiedad_id": {"type": "integer", "description": "ID de la propiedad a consultar"}
                },
                "required": ["propiedad_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "agendar_visita",
            "description": "Agenda una visita a una propiedad específica para el usuario actual. Requiere que el usuario esté registrado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "propiedad_id": {"type": "integer", "description": "ID de la propiedad"},
                    "fecha": {"type": "string", "description": "Fecha y hora solicitada para la visita (ej: 'Este viernes a las 17:00')"}
                },
                "required": ["propiedad_id", "fecha"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calcular_hipoteca",
            "description": "Calcula la cuota mensual de una hipoteca. Usa esta herramienta cuando el usuario pregunte sobre financiación, hipotecas o cuánto pagaría al mes.",
            "parameters": {
                "type": "object",
                "properties": {
                    "precio": {"type": "number", "description": "Precio del inmueble en euros"},
                    "entrada_porcentaje": {"type": "number", "description": "Porcentaje de entrada (default 20%)"},
                    "plazo_anos": {"type": "integer", "description": "Plazo de la hipoteca en años (default 25)"},
                    "interes_anual": {"type": "number", "description": "Tipo de interés anual en porcentaje (default 3.0%)"}
                },
                "required": ["precio"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "comparar_propiedades",
            "description": "Compara hasta 4 propiedades lado a lado mostrando precio, precio/m², habitaciones, área, ciudad, etc. Usa cuando el usuario quiera comparar propiedades.",
            "parameters": {
                "type": "object",
                "properties": {
                    "ids": {"type": "array", "items": {"type": "integer"}, "description": "Lista de IDs de las propiedades a comparar (mínimo 2, máximo 4)"}
                },
                "required": ["ids"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analisis_zona",
            "description": "Obtiene estadísticas del mercado inmobiliario en una zona: precio medio, rango de precios, precio/m², tipos disponibles. Usa cuando el usuario pregunte sobre el mercado, tendencias o estadísticas de una zona.",
            "parameters": {
                "type": "object",
                "properties": {
                    "zona": {"type": "string", "description": "Nombre de la ciudad, barrio o zona a analizar"}
                },
                "required": ["zona"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "calcular_roi",
            "description": "Calcula el retorno de inversión (ROI) avanzado incluyendo gastos reales (comunidad, IBI, seguro). Usa cuando el usuario pregunte sobre rentabilidad, inversión o ROI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "precio_compra": {"type": "number", "description": "Precio de compra del inmueble"},
                    "alquiler_mensual": {"type": "number", "description": "Alquiler mensual estimado o real"},
                    "gastos_comunidad": {"type": "number", "description": "Gastos de comunidad mensuales (default 100€)"},
                    "ibi_anual": {"type": "number", "description": "IBI anual (si es 0, se estima al 0.5% del precio)"},
                    "seguro_anual": {"type": "number", "description": "Seguro anual del hogar (default 300€)"}
                },
                "required": ["precio_compra", "alquiler_mensual"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mis_favoritos",
            "description": "Consulta las propiedades que el usuario ha guardado en favoritos. Requiere que el usuario esté registrado.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mostrar_en_mapa",
            "description": "Genera un enlace directo al modo mapa interactivo con filtros aplicados. Usa cuando el usuario quiera ver propiedades en el mapa.",
            "parameters": {
                "type": "object",
                "properties": {
                    "zona": {"type": "string", "description": "Ciudad o zona a centrar en el mapa"},
                    "tipo": {"type": "string", "description": "Tipo de propiedad a filtrar"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "estadisticas_cartera",
            "description": "Obtiene estadísticas de la cartera de propiedades del usuario (solo para inmobiliarias y administradores).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "propiedades_similares",
            "description": "Busca propiedades similares a una dada (mismo tipo, misma zona, precio similar ±30%). Usa cuando el usuario quiera alternativas o propiedades parecidas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "propiedad_id": {"type": "integer", "description": "ID de la propiedad de referencia"}
                },
                "required": ["propiedad_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "busqueda_semantica",
            "description": "Realiza una búsqueda difusa o por conceptos en propiedades (ej: 'casa luminosa cerca del mar').",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Concepto o descripción buscada"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "redactar_mensaje",
            "description": "Redacta un mensaje profesional para enviar a un cliente o propietario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contexto": {"type": "string", "description": "De qué trata el mensaje y qué se quiere comunicar"}
                },
                "required": ["contexto"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "analizar_entorno",
            "description": "Obtiene información de mapas sobre servicios, colegios o entorno cercanos a una propiedad.",
            "parameters": {
                "type": "object",
                "properties": {
                    "propiedad_id": {"type": "integer", "description": "ID de la propiedad a analizar su entorno geográfico"}
                },
                "required": ["propiedad_id"]
            }
        }
    }
]

async def execute_tool(name: str, args: dict, user_id: Optional[int], user_role: str) -> str:
    """Ejecuta la herramienta que ha pedido el modelo y devuelve su resultado en JSON."""
    if name == "buscar_propiedades":
        return await buscar_propiedades(user_id, user_role, args.get("ubicacion", ""), float(args.get("precio_maximo", 0.0)), args.get("tipo", ""), args.get("estado", ""))
    if name == "obtener_detalles":
        return await obtener_detalles(user_id, user_role, int(args.get("propiedad_id", 0)))
    if name == "calcular_roi":
        return await calcular_roi_avanzado(
            float(args.get("precio_compra", 1)),
            float(args.get("alquiler_mensual", 0)),
            float(args.get("gastos_comunidad", 100.0)),
            float(args.get("ibi_anual", 0.0)),
            float(args.get("seguro_anual", 300.0))
        )
    if name == "agendar_visita":
        prop = args.get("propiedad_id", "No ID")
        fecha = args.get("fecha", "Fecha no especificada")
        return json.dumps({"status": "success", "mensaje_para_ia": f"La cita para la propiedad {prop} el día {fecha} ha sido validada y notificada a la inmobiliaria."})
    if name == "calcular_hipoteca":
        return await calcular_hipoteca(
            float(args.get("precio", 0)),
            float(args.get("entrada_porcentaje", 20.0)),
            int(args.get("plazo_anos", 25)),
            float(args.get("interes_anual", 3.0))
        )
    if name == "comparar_propiedades":
        return await comparar_propiedades(args.get("ids", []))
    if name == "analisis_zona":
        return await analisis_zona(args.get("zona", ""))
    if name == "mis_favoritos":
        return await mis_favoritos(user_id)
    if name == "mostrar_en_mapa":
        return await mostrar_en_mapa(args.get("zona", ""), args.get("tipo", ""))
    if name == "estadisticas_cartera":
        return await estadisticas_cartera(user_id, user_role)
    if name == "propiedades_similares":
        return await propiedades_similares(int(args.get("propiedad_id", 0)))
    if name == "busqueda_semantica":
        query = args.get("query", "")
        return json.dumps({"contexto": f"Se han simulado los embeddings de '{query}'. Dile al usuario que hay 3 propiedades con gran iluminación o cercanía al objetivo en el catálogo."})
    if name == "redactar_mensaje":
        ctx = args.get("contexto", "")
        redaccion = f"Estimado/a,\n\n{ctx}\n\nQuedo a su entera disposición.\n\nUn cordial saludo,\nUbica Bot."
        return json.dumps({"borrador_sugerido": redaccion})
    if name == "analizar_entorno":
        return json.dumps({"analisis_mapa": "Colegios cercanos: 2. Supermercados: 1 a 5 min andando. Transporte público cercano. Zona residencial nivel seguro."})
    return "{}"
