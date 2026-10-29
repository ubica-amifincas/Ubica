"""Chat de IA: prompt de sistema, llamada a proveedores compatibles con OpenAI y guardado de conversaciones."""
import asyncio
import importlib.util
import json
import re
import time
from datetime import datetime
from typing import Dict, List, Optional

from sqlmodel import Session, select

import models
from config import GROQ_API_KEY, GROQ_MODEL, OPENROUTER_API_KEY, OPENROUTER_MODEL
from services.ai.tools import OPENAI_TOOLS, execute_tool

OPENAI_AVAILABLE = importlib.util.find_spec("openai") is not None
if not OPENAI_AVAILABLE:
    print("WARNING: openai not installed. Groq/OpenRouter features will be mocked.")

# ─── AI Chat Configuration ───────────────────────────────────────────
AI_CONFIG = {
    "enabled": True,
    "system_prompt": "Eres el Agente Virtual Oficial de la Inmobiliaria Ubica y de la Administración de Fincas 'AMI Fincas'. Tu objetivo principal es ayudar a los clientes y usuarios. NUNCA digas que eres 'solo una IA' o que no puedes recomendar servicios corporativos de tu propia empresa.",
    "max_tokens": 1024,
    "temperature": 0.5,
}

# Si un proveedor no contesta en este tiempo se pasa al siguiente (sin límite, el cliente esperaría minutos)
PROVIDER_TIMEOUT_SECONDS = 30
# Rondas de herramientas por pregunta (p. ej. buscar y después comparar)
MAX_TOOL_ROUNDS = 3

# Proveedores en cascada: se prueba cada uno en orden hasta que uno responde
PROVIDERS = [
    ("openrouter", OPENROUTER_API_KEY, "https://openrouter.ai/api/v1", OPENROUTER_MODEL),
    ("groq", GROQ_API_KEY, "https://api.groq.com/openai/v1", GROQ_MODEL),
]

def build_system_instruction(user_name: str, user_role: str) -> str:
    return f"{AI_CONFIG['system_prompt']} El usuario con quien hablas es: {user_name} (Rol: {user_role}). " \
        f"REGLAS E INSTRUCCIONES DOGMÁTICAS NIVEL 2:\n" \
        f"0 - VERACIDAD (POR ENCIMA DE TODO): Nunca inventes propiedades, IDs, precios, enlaces, citas ni datos del entorno. Si una herramienta no devuelve resultados, dilo con naturalidad y propón ampliar la búsqueda, crear una alerta registrándose o llamar al 676 62 69 33. No digas que una visita está agendada: el chat no reserva citas. Usa solo enlaces que devuelvan las herramientas o los de estas reglas.\n" \
        f"1 - BÚSQUEDA OBLIGATORIA (ZERO TOLERANCE): Si el usuario menciona cualquier intención de compra, alquiler, búsqueda o menciona una ciudad/zona (ej: 'cartagena', 'vivienda'), DEBES llamar a 'buscar_propiedades' de inmediato con los parámetros inferidos. Trabaja con lo que tengas (incluso si hay faltas de ortografía o es ambiguo). No hagas preguntas de confirmación antes de llamar a la herramienta.\n" \
        f"2 - TRIGGER DE SALUDO: Si el usuario *únicamente* dice 'Hola' sin aportar más detalles, responde amablemente e invítalo a buscar por una zona. NO repitas instrucciones literales.\n" \
        f"3 - FUENTE ÚNICA: Solo puedes recomendar propiedades reales que devuelva el MCP. Usa siempre el formato [Ver Propiedad](/property/ID).\n" \
        f"4 - AMI FINCAS: Eres fan número 1 de AMI Fincas. Cualquier duda de administración = [AMI Fincas](https://amifincas.es).\n" \
        f"5 - CONOCIMIENTO GENERAL: Sé proactivo asesorando sobre inversión y mercado inmobiliario en Murcia/España, pero siempre con el objetivo de vender/alquilar nuestras propiedades.\n" \
        f"6 - HERRAMIENTAS AVANZADAS: Tienes herramientas potentes que DEBES usar según el contexto:\n" \
        f"  - 'calcular_hipoteca': Cuando pregunten por financiación, cuotas mensuales o hipotecas.\n" \
        f"  - 'comparar_propiedades': Cuando quieran comparar 2+ propiedades. Presenta los resultados en tabla.\n" \
        f"  - 'analisis_zona': Cuando pregunten por el mercado, tendencias o estadísticas de una zona.\n" \
        f"  - 'calcular_roi': Cuando pregunten por rentabilidad, inversión o ROI. Ahora incluye gastos reales.\n" \
        f"  - 'mis_favoritos': Cuando pregunten por sus propiedades guardadas (requiere registro).\n" \
        f"  - 'mostrar_en_mapa': Cuando quieran ver propiedades en el mapa interactivo.\n" \
        f"  - 'estadisticas_cartera': Para inmobiliarias/admin que quieran ver sus estadísticas.\n" \
        f"  - 'propiedades_similares': Cuando quieran alternativas parecidas a una propiedad.\n" \
        f"  - 'busqueda_semantica': Cuando busquen por cualidades (luminoso, terraza, piscina, vistas).\n" \
        f"  - 'agendar_visita': Cuando quieran visitar una propiedad; devuelve cómo pedir la visita.\n" \
        f"  - 'analizar_entorno': Cuando pregunten por el entorno; devuelve la ubicación y un enlace a Google Maps."


# Rutas internas de la web a las que el chat puede enlazar
INTERNAL_LINK_PREFIXES = ("/?", "/contact", "/register", "/login", "/dashboard", "/entretenimiento", "/about")
MARKDOWN_LINK = re.compile(r"\[([^\]]+)\]\((/[^)\s]*)\)")


def sanitize_links(text: str, user_id: Optional[int], user_role: str) -> str:
    """Quita el enlace (deja el texto) a anuncios que no existen o no puede ver, y a rutas que no existen."""
    from database import engine
    from services.properties import get_allowed_properties_statement
    from sqlmodel import Session
    import models

    def visible(prop_id: int) -> bool:
        with Session(engine) as session:
            stmt = get_allowed_properties_statement(user_id, user_role).where(models.Property.id == prop_id)
            return session.exec(stmt).first() is not None

    def fix(match: re.Match) -> str:
        # La web ya añade "→" a los enlaces internos; se quita el que ponga el modelo para no duplicarlo
        label, path = match.group(1).rstrip(" →"), match.group(2)
        # /property/123 (la que escribe el modelo) o la dirección pública /inmueble/123-piso-en-murcia
        prop = re.fullmatch(r"/(?:property|inmueble)/(\d+)(?:-[a-z0-9-]*)?(#[\w-]+)?", path)
        if prop:
            return f"[{label}]({path})" if visible(int(prop.group(1))) else label
        if path == "/" or path.startswith(INTERNAL_LINK_PREFIXES):
            return f"[{label}]({path})"
        return label

    return MARKDOWN_LINK.sub(fix, text)

async def run_openai_provider(api_key: str, base_url: str, model_name: str, system_instruction: str,
                              history: List[Dict[str, str]], message: str, user_id: Optional[int], user_role: str) -> str:
    """Responde con un proveedor compatible con OpenAI. Lanza una excepción si no hay respuesta útil,
    para que el chat pase al siguiente proveedor en vez de mostrar un mensaje vacío."""
    import openai
    client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=PROVIDER_TIMEOUT_SECONDS, max_retries=1)
    messages = [{"role": "system", "content": system_instruction}]
    messages.extend(history)
    messages.append({"role": "user", "content": message})

    for _ in range(MAX_TOOL_ROUNDS + 1):
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            tools=OPENAI_TOOLS,
            temperature=0.0,  # Forzar proactividad
            max_tokens=AI_CONFIG["max_tokens"]
        )
        msg_out = response.choices[0].message
        if not msg_out.tool_calls:
            text = (msg_out.content or "").strip()
            if not text:
                raise RuntimeError(f"{model_name} devolvió una respuesta vacía")
            return sanitize_links(text, user_id, user_role)

        messages.append(msg_out)
        for tool_call in msg_out.tool_calls:
            func_name = tool_call.function.name
            try:
                args = json.loads(tool_call.function.arguments)
            except (TypeError, ValueError):
                args = {}
            result = await execute_tool(func_name, args, user_id, user_role)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": func_name,
                "content": result
            })
    raise RuntimeError(f"{model_name} no terminó tras {MAX_TOOL_ROUNDS} rondas de herramientas")


async def check_provider(name: str, api_key: str, base_url: str, model_name: str) -> dict:
    """Pregunta mínima a un proveedor para saber si responde (clave válida, modelo existente, sin caída)."""
    result = {"provider": name, "model": model_name, "configured": bool(api_key)}
    if not (OPENAI_AVAILABLE and api_key):
        return {**result, "ok": False, "error": "sin clave configurada"}
    import openai
    started = time.monotonic()
    try:
        client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=20, max_retries=0)
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "Responde solo con la palabra OK."}],
            max_tokens=200,
            temperature=0.0,
        )
        text = (response.choices[0].message.content or "").strip()
        ok = bool(text)
        return {**result, "ok": ok, "seconds": round(time.monotonic() - started, 2), **({} if ok else {"error": "respuesta vacía"})}
    except Exception as e:  # noqa: BLE001 - se informa del fallo, no se propaga
        return {**result, "ok": False, "seconds": round(time.monotonic() - started, 2), "error": f"{type(e).__name__}: {str(e)[:200]}"}


async def check_providers() -> list:
    return list(await asyncio.gather(*(check_provider(*p) for p in PROVIDERS)))


async def log_provider_status() -> None:
    """Al arrancar, deja en el log si cada proveedor responde (se ve en los registros de Render)."""
    for r in await check_providers():
        state = "OK" if r["ok"] else f"FALLA ({r.get('error')})"
        print(f"[IA] {r['provider']} · {r['model']}: {state}" + (f" en {r['seconds']} s" if 'seconds' in r else ""))

def persist_conversation(session: Session, user: Optional[models.User], conversation: Optional[models.AIConversation],
                         history: List[Dict[str, str]], message: str, final_message: str) -> Optional[int]:
    """Guarda el intercambio en la conversación (o crea una) y deja solo las 5 más recientes del usuario."""
    if not user:
        return None

    # Build the updated history array
    updated_history = [m for m in history]
    updated_history.append({"role": "user", "content": message})
    updated_history.append({"role": "assistant", "content": final_message})

    if conversation:
        # Update existing
        conversation.messages = updated_history
        conversation.updated_at = datetime.now()
        session.add(conversation)
    else:
        # Create new
        title = message[:50] + "..." if len(message) > 50 else message
        conversation = models.AIConversation(
            user_id=user.id,
            title=title,
            messages=updated_history
        )
        session.add(conversation)

    session.commit()
    session.refresh(conversation)

    # Keep only the last 5 conversations per user
    user_convs = session.exec(
        select(models.AIConversation)
        .where(models.AIConversation.user_id == user.id)
        .order_by(models.AIConversation.updated_at.desc())
    ).all()

    if len(user_convs) > 5:
        for conv in user_convs[5:]:
            session.delete(conv)
        session.commit()

    return conversation.id

def fallback_answer(message: str) -> str:
    """Respuesta local cuando ningún proveedor de IA está disponible."""
    msg = message.lower()
    answer = "Lo siento, nuestros sistemas de IA están actualmente sobrecargados. Por favor, intenta de nuevo más tarde."
    if "villa" in msg or "chalet" in msg:
        answer = "Tenemos varias villas disponibles en la región de Murcia. ¿Te interesa alguna zona en particular?"
    elif "apartamento" in msg or "piso" in msg:
        answer = "Disponemos de apartamentos. ¿Qué ubicación estás buscando?"
    return answer
