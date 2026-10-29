"""Registro, verificación de email, login y usuario actual."""
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
import jwt
from datetime import datetime
from sqlmodel import Session, select

import models
from config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, FRONTEND_URL, SECRET_KEY
from database import get_session
from schemas import LoginRequest, Token, User, UserCreate
from security import create_access_token, create_session_token, get_current_user, hash_password, is_legacy_hash, verify_password
from services.email import send_email_resend, verification_email_html

router = APIRouter()

SELF_SERVICE_ROLES = {"user", "investor", "realtor"}

@router.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(models.User).where(models.User.email == login_data.email)).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )

    # Migración transparente: al entrar con un hash SHA-256 antiguo se guarda en bcrypt
    if is_legacy_hash(user.hashed_password):
        user.hashed_password = hash_password(login_data.password)
        session.add(user)
        session.commit()
        session.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta está desactivada"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Por favor verifica tu correo electrónico para iniciar sesión"
        )

    access_token = create_session_token(user)
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User.model_validate(user, from_attributes=True)
    )

@router.post("/api/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # El registro público no puede crear administradores: solo los roles que ofrece el formulario
    if user_data.role not in SELF_SERVICE_ROLES:
        raise HTTPException(status_code=400, detail="Rol no permitido")

    existing_user = session.exec(select(models.User).where(models.User.email == user_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    new_user = models.User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=user_data.role,
        company=user_data.company,
        phone=user_data.phone,
        is_active=True,
        is_verified=False
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    new_id = new_user.id
    
    # Generar token de verificación
    verify_token = create_access_token(data={"sub": str(new_id), "type": "verify"})
    
    # URL base para el link de verificación (prioriza variable de entorno)
    verification_link = f"{FRONTEND_URL}/verify?token={verify_token}"
    
    # Preparar el correo con diseño premium
    html_content = verification_email_html(user_data.full_name, verification_link)
    
    # Añadir a tareas en segundo plano
    background_tasks.add_task(send_email_resend, user_data.email, "Verifica tu cuenta en Ubica Enterprise", html_content)
    
    return {
        "message": "Usuario registrado exitosamente. Por favor revisa tu correo electrónico para verificar tu cuenta.",
        "user_id": new_id
    }

@router.get("/api/auth/verify-email")
async def verify_email(token: str, session: Session = Depends(get_session)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id_str is None or token_type != "verify":
            raise HTTPException(status_code=400, detail="Token inválido")
        user_id = int(user_id_str)
            
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Token expirado o inválido")
        
    user = session.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    if user.is_verified:
        return {"message": "El correo ya había sido verificado"}
        
    user.is_verified = True
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    
    return {"message": "Correo verificado exitosamente. Ya puedes iniciar sesión."}

@router.get("/api/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user
