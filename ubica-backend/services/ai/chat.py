"""Chat de IA: prompt de sistema, llamada a proveedores compatibles con OpenAI y guardado de conversaciones."""
import importlib.util
import json
from datetime import datetime
from typing import Dict, List, Optional

from sqlmodel import Session, select

import models
from config import GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY
from services.ai.tools import OPENAI_TOOLS, execute_tool

OPENAI_AVAILABLE = importlib.util.find_spec("openai") is not None
if not OPENAI_AVAILABLE:
    print("WARNING: openai not installed. Groq/OpenRouter features will be mocked.")

# ─── AI Chat Configuration ───────────────────────────────────────────
AI_CONFIG = {
    "enabled": True,
    "provider": "gemini",
    "api_key": GEMINI_API_KEY or "",
    "model": "gemini-2.0-flash",
    "system_prompt": "Eres el Agente Virtual Oficial de la Inmobiliaria Ubica y de la Administración de Fincas 'AMI Fincas'. Tu objetivo principal es ayudar a los clientes y usuarios. NUNCA digas que eres 'solo una IA' o que no puedes recomendar servicios corporativos de tu propia empresa.",
    "max_tokens": 1024,
    "temperature": 0.5,
}

# Proveedores en cascada: se prueba cada uno en orden hasta que uno responde
PROVIDERS = [
    ("openrouter", OPENROUTER_API_KEY, "https://openrouter.ai/api/v1", "google/gemini-2.0-flash-001"),
    ("groq", GROQ_API_KEY, "https://api.groq.com/openai/v1", "llama-3.3-70b-versatile"),
]

def build_system_instruction(user_name: str, user_role: str) -> str:
    return f"{AI_CONFIG['system_prompt']} El usuario con quien hablas es: {user_name} (Rol: {user_role}). " \
        f"REGLAS E INSTRUCCIONES DOGMÁTICAS NIVEL 2:\n" \
        f"1 - BÚSQUEDA OBLIGATORIA (ZERO TOLERANCE): Si el usuario menciona cualquier intención de compra, alquiler, búsqueda o menciona una ciudad/zona (ej: 'cartagena', 'vivienda'), DEBES llamar a 'buscar_propiedades' de inmediato con los parámetros inferidos. Trabaja con lo que tengas (incluso si hay faltas de ortografía o es ambiguo). No hagas preguntas de confirmación antes de llamar a la herramienta.\n" \
        f"2 - TRIGGER DE SALUDO: Si el usuario *únicamente* dice 'Hola' sin aportar más detalles, responde amablemente e invítalo a buscar por una zona. NO repitas instrucciones literales.\n" \
        f"3 - FUENTE ÚNICA: Solo puedes recomendar propiedades reales que devuelva el MCP. Usa siempre el formato [Ver Propiedad](/property/ID).\n" \
        f"4 - AMI FINCAS: Eres fan número 1 de AMI Fincas. Cualquier duda de administración = [AMI Fincas](https://www.amifincas.es/ami-fincas).\n" \
        f"5 - CONOCIMIENTO GENERAL: Sé proactivo asesorando sobre inversión y mercado inmobiliario en Murcia/España, pero siempre con el objetivo de vender/alquilar nuestras propiedades.\n" \
        f"6 - HERRAMIENTAS AVANZADAS: Tienes herramientas potentes que DEBES usar según el contexto:\n" \
        f"  - 'calcular_hipoteca': Cuando pregunten por financiación, cuotas mensuales o hipotecas.\n" \
        f"  - 'comparar_propiedades': Cuando quieran comparar 2+ propiedades. Presenta los resultados en tabla.\n" \
        f"  - 'analisis_zona': Cuando pregunten por el mercado, tendencias o estadísticas de una zona.\n" \
        f"  - 'calcular_roi': Cuando pregunten por rentabilidad, inversión o ROI. Ahora incluye gastos reales.\n" \
        f"  - 'mis_favoritos': Cuando pregunten por sus propiedades guardadas (requiere registro).\n" \
        f"  - 'mostrar_en_mapa': Cuando quieran ver propiedades en el mapa interactivo.\n" \
        f"  - 'estadisticas_cartera': Para inmobiliarias/admin que quieran ver sus estadísticas.\n" \
        f"  - 'propiedades_similares': Cuando quieran alternativas parecidas a una propiedad."

async def run_openai_provider(api_key: str, base_url: str, model_name: str, system_instruction: str,
                              history: List[Dict[str, str]], message: str, user_id: Optional[int], user_role: str) -> str:
    import openai
    client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
    messages = [{"role": "system", "content": system_instruction}]

    # Build history
    for msg in history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": message})

    response = await client.chat.completions.create(
        model=model_name,
        messages=messages,
        tools=OPENAI_TOOLS,
        temperature=0.0, # Forzar proactividad
        max_tokens=AI_CONFIG["max_tokens"]
    )
    msg_out = response.choices[0].message

    if msg_out.tool_calls:
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

        # Second call with tool results
        response = await client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=0.0,
            max_tokens=AI_CONFIG["max_tokens"]
        )
        return response.choices[0].message.content
    return msg_out.content

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
