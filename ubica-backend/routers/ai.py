"""Chat de IA y conversaciones guardadas."""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

import models
from database import get_session
from schemas import AIChatRequest
from security import get_current_user, get_user_or_none, require_role
from services.ai.chat import (AI_CONFIG, OPENAI_AVAILABLE, PROVIDERS, build_system_instruction, check_providers, fallback_answer,
                             persist_conversation, run_openai_provider)
from services.ai.usage import check_ai_usage
from services.ratelimit import get_client_ip

router = APIRouter()

@router.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest, request_obj: Request, current_user: Optional[models.User] = Depends(get_user_or_none), session: Session = Depends(get_session)):
    """
    Endpoint de chat con IA en cascada (OpenRouter -> Groq -> respuesta local).
    """

    # 1. Verificar Límites (Freemium)
    user_id = current_user.id if current_user else None
    user_role = current_user.role if current_user else "guest"
    client_ip = get_client_ip(request_obj)

    if not check_ai_usage(user_id=user_id, ip=client_ip, role=user_role):
        raise HTTPException(
            status_code=429,
            detail="Has alcanzado tu límite de consultas gratuitas por hoy. 🚀 ¡Regístrate o actualiza a un plan Premium para seguir consultando!"
        )

    # Validate conversation ownership if provided
    db_conversation = None
    if request.conversation_id and current_user:
        db_conversation = session.get(models.AIConversation, request.conversation_id)
        if db_conversation and db_conversation.user_id != user_id:
            db_conversation = None # Not theirs, ignore or could raise 403

    user_name = current_user.full_name if current_user else "Invitado"
    system_instruction = build_system_instruction(user_name, user_role)

    for provider, api_key, base_url, model_name in PROVIDERS:
        if not (OPENAI_AVAILABLE and api_key):
            continue
        try:
            res_text = await run_openai_provider(api_key, base_url, model_name, system_instruction,
                                                 request.history, request.message, user_id, user_role)
            conv_id = persist_conversation(session, current_user, db_conversation, request.history, request.message, res_text)
            return {"message": res_text, "provider": provider, "model": model_name, "conversation_id": conv_id}
        except Exception as e:
            print(f"{provider} failed: {e}")

    # Fallback si todo falla
    answer = fallback_answer(request.message)
    conv_id = persist_conversation(session, current_user, db_conversation, request.history, request.message, answer)
    return {
        "message": answer,
        "provider": "mock",
        "model": "placeholder",
        "conversation_id": conv_id
    }

@router.get("/api/ai/config")
async def get_ai_config(check: bool = False, current_user: models.User = Depends(require_role(["admin"]))):
    """Configuración de la IA (solo admin). Con ?check=true pregunta a cada proveedor si responde."""
    providers = await check_providers() if check else [
        {"provider": name, "model": model, "configured": bool(key)} for name, key, _, model in PROVIDERS
    ]
    return {
        "enabled": AI_CONFIG["enabled"],
        "providers": providers,
        "has_api_key": any(bool(key) for _, key, _, _ in PROVIDERS),
        "max_tokens": AI_CONFIG["max_tokens"],
        "temperature": AI_CONFIG["temperature"],
    }

@router.get("/api/ai/conversations")
async def get_ai_conversations(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    """API para obtener las ultimas 5 conversaciones de IA del usuario."""
    conversations = session.exec(
        select(models.AIConversation)
        .where(models.AIConversation.user_id == current_user.id)
        .order_by(models.AIConversation.updated_at.desc())
        .limit(5)
    ).all()
    
    # Return limited metadata to the UI 
    results = []
    for c in conversations:
        msgs = json.loads(c.messages) if isinstance(c.messages, str) else (c.messages or [])
        results.append({
            "id": c.id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(msgs)
        })
    return results

@router.get("/api/ai/conversations/{conversation_id}")
async def get_ai_conversation_details(conversation_id: int, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    """API para obtener el historial completo de una conversacion especifica"""
    conversation = session.get(models.AIConversation, conversation_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversación no encontrada o sin acceso")
    
    return {
        "id": conversation.id,
        "title": conversation.title,
        "updated_at": conversation.updated_at.isoformat(),
        "messages": json.loads(conversation.messages) if isinstance(conversation.messages, str) else conversation.messages
    }
