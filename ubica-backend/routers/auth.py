"""Registro, verificación de email, login, recuperación de contraseña y cambio de email."""
import secrets
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
import jwt
from datetime import datetime
from sqlmodel import Session, func, select

import models
from google.auth.exceptions import GoogleAuthError

from config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, FRONTEND_URL, GOOGLE_CLIENT_ID, SECRET_KEY
from database import get_session
from schemas import (ChangeEmailRequest, ChangePasswordRequest, ForgotPasswordRequest, GoogleLoginRequest, LoginRequest, ResetPasswordRequest,
                     Token, User, UserCreate)
from security import (burn_password_check, create_access_token, create_session_token, decode_purpose_token, get_current_user,
                      hash_password, is_legacy_hash, password_fingerprint, verify_password)
from services.google_auth import verify_google_credential
from services.email import email_change_email_html, password_reset_email_html, send_email_resend, verification_email_html
from services.ratelimit import RateLimiter, get_client_ip

router = APIRouter()

SELF_SERVICE_ROLES = {"user", "investor", "realtor"}

# Fuerza bruta: intentos fallidos por email y por IP en 15 minutos
login_email_limiter = RateLimiter(10, 15 * 60)
login_ip_limiter = RateLimiter(30, 15 * 60)
# Correos de recuperación: por encima del límite no se envían, pero la respuesta es la misma
forgot_email_limiter = RateLimiter(3, 60 * 60)
forgot_ip_limiter = RateLimiter(10, 60 * 60)

TOO_MANY_ATTEMPTS = "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
INVALID_LINK = "El enlace no es válido o ha caducado"
FORGOT_MESSAGE = "Si el email está registrado, te hemos enviado un enlace para restablecer la contraseña."
RESET_TOKEN_MINUTES = 60
EMAIL_CHANGE_TOKEN_MINUTES = 24 * 60

def _find_user_by_email(session: Session, email: str):
    return session.exec(select(models.User).where(func.lower(models.User.email) == email.strip().lower())).first()

def _token_response(user: models.User) -> Token:
    return Token(
        access_token=create_session_token(user),
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=User.model_validate(user, from_attributes=True)
    )

@router.post("/api/auth/login", response_model=Token)
async def login(login_data: LoginRequest, request: Request, session: Session = Depends(get_session)):
    email_key = login_data.email.strip().lower()
    client_ip = get_client_ip(request)
    if login_email_limiter.is_limited(email_key) or login_ip_limiter.is_limited(client_ip):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY_ATTEMPTS)

    user = _find_user_by_email(session, login_data.email)
    if user is None:
        burn_password_check(login_data.password)
    if not user or not verify_password(login_data.password, user.hashed_password):
        login_email_limiter.hit(email_key)
        login_ip_limiter.hit(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos"
        )
    login_email_limiter.reset(email_key)

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

    return _token_response(user)

@router.get("/api/auth/google/config")
async def google_config():
    """El frontend pinta el botón de Google solo si hay Client ID (es público)."""
    return {"client_id": GOOGLE_CLIENT_ID or None}

@router.post("/api/auth/google", response_model=Token)
def google_login(data: GoogleLoginRequest, request: Request, session: Session = Depends(get_session)):
    """Entrar (o registrarse) con Google. Síncrona: verificar el token descarga las claves de Google."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El acceso con Google no está disponible")
    client_ip = get_client_ip(request)
    if login_ip_limiter.is_limited(client_ip):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY_ATTEMPTS)

    try:
        info = verify_google_credential(data.credential)
    except ValueError:
        login_ip_limiter.hit(client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se ha podido verificar tu cuenta de Google")
    except GoogleAuthError:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google no responde ahora mismo. Inténtalo de nuevo en unos minutos.")

    email = info["email"].strip().lower()
    user = _find_user_by_email(session, email)
    if user is None:
        # Cuenta nueva: Google ya ha verificado el correo. Contraseña aleatoria que nadie conoce;
        # si algún día quiere entrar con contraseña, la crea con "¿Olvidaste tu contraseña?"
        user = models.User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            full_name=(info.get("name") or email.split("@")[0])[:120],
            role=data.role or "user",
            is_active=True,
            is_verified=True,
        )
        session.add(user)
    else:
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Esta cuenta está desactivada")
        if not user.is_verified:
            # Alguien registró este correo con contraseña y nunca lo verificó: no demostró que fuera suyo.
            # El dueño real (Google lo acaba de confirmar) se queda la cuenta y esa contraseña deja de valer.
            user.hashed_password = hash_password(secrets.token_urlsafe(32))
            user.is_verified = True
            session.add(user)
    session.commit()
    session.refresh(user)
    login_email_limiter.reset(email)
    return _token_response(user)

@router.post("/api/auth/register", response_model=Dict[str, Any])
async def register(user_data: UserCreate, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # El registro público no puede crear administradores: solo los roles que ofrece el formulario
    if user_data.role not in SELF_SERVICE_ROLES:
        raise HTTPException(status_code=400, detail="Rol no permitido")

    existing_user = _find_user_by_email(session, user_data.email)
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

@router.post("/api/auth/change-password", response_model=Token)
async def change_password(data: ChangePasswordRequest, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    current_user.hashed_password = hash_password(data.new_password)
    current_user.updated_at = datetime.now()
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    # El token anterior queda revocado (cambia "pv"): se devuelve uno nuevo
    return _token_response(current_user)

@router.post("/api/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    # Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados
    email_key = data.email.strip().lower()
    if not forgot_ip_limiter.check_and_hit(get_client_ip(request)) or not forgot_email_limiter.check_and_hit(email_key):
        return {"message": FORGOT_MESSAGE}
    user = _find_user_by_email(session, data.email)
    if user is not None and user.is_active:
        token = create_access_token(
            {"sub": str(user.id), "type": "reset", "pv": password_fingerprint(user.hashed_password)},
            expires_minutes=RESET_TOKEN_MINUTES)
        html = password_reset_email_html(user.full_name, f"{FRONTEND_URL}/reset-password?token={token}")
        background_tasks.add_task(send_email_resend, user.email, "Restablece tu contraseña de Ubica", html)
    return {"message": FORGOT_MESSAGE}

@router.post("/api/auth/reset-password")
async def reset_password(data: ResetPasswordRequest, session: Session = Depends(get_session)):
    # El token lleva la huella de la contraseña: al cambiarla el enlace deja de valer (un solo uso)
    found = decode_purpose_token(data.token, "reset", session)
    if found is None:
        raise HTTPException(status_code=400, detail=INVALID_LINK)
    user, _ = found
    user.hashed_password = hash_password(data.new_password)
    user.is_verified = True  # ha demostrado que controla el email
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    login_email_limiter.reset(user.email.strip().lower())
    return {"message": "Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña."}

@router.post("/api/auth/change-email")
async def change_email(data: ChangeEmailRequest, background_tasks: BackgroundTasks, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="La contraseña no es correcta")
    if _find_user_by_email(session, data.new_email) is not None:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    token = create_access_token(
        {"sub": str(current_user.id), "type": "email_change", "new_email": data.new_email, "email": current_user.email,
         "pv": password_fingerprint(current_user.hashed_password)},
        expires_minutes=EMAIL_CHANGE_TOKEN_MINUTES)
    html = email_change_email_html(current_user.full_name, data.new_email, f"{FRONTEND_URL}/confirm-email-change?token={token}")
    # El enlace va a la dirección nueva: así se comprueba que es suya
    background_tasks.add_task(send_email_resend, data.new_email, "Confirma tu nuevo email en Ubica", html)
    return {"message": f"Te hemos enviado un enlace de confirmación a {data.new_email}"}

@router.get("/api/auth/confirm-email-change")
async def confirm_email_change(token: str, session: Session = Depends(get_session)):
    found = decode_purpose_token(token, "email_change", session)
    if found is None or not isinstance(found[1].get("new_email"), str):
        raise HTTPException(status_code=400, detail=INVALID_LINK)
    user, payload = found
    new_email = payload["new_email"]
    if user.email == new_email:
        return {"message": "Tu email ya estaba actualizado"}
    # Un enlace antiguo no sirve si el email ha cambiado después de pedirlo
    if user.email != payload.get("email"):
        raise HTTPException(status_code=400, detail=INVALID_LINK)
    existing = _find_user_by_email(session, new_email)
    if existing is not None and existing.id != user.id:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    user.email = new_email
    user.is_verified = True
    user.updated_at = datetime.now()
    session.add(user)
    session.commit()
    return {"message": "Email actualizado correctamente. Usa tu nuevo email para iniciar sesión."}
