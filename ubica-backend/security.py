"""Contraseñas (bcrypt, con migración desde SHA-256) y autenticación por JWT."""
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

import models
from config import ACCESS_TOKEN_EXPIRE_MINUTES, ALGORITHM, SECRET_KEY
from database import get_session

bearer_scheme = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def is_legacy_hash(hashed_password: str) -> bool:
    # Hashes antiguos: SHA-256 sin sal (64 caracteres hex)
    return not hashed_password.startswith("$2")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if is_legacy_hash(hashed_password):
        legacy = hashlib.sha256(plain_password.encode()).hexdigest()
        return hmac.compare_digest(legacy, hashed_password)
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def password_fingerprint(hashed_password: str) -> str:
    # Va dentro del token de sesión: si cambia la contraseña, los tokens anteriores dejan de valer
    return hmac.new(SECRET_KEY.encode(), hashed_password.encode(), hashlib.sha256).hexdigest()[:16]

def create_session_token(user: models.User) -> str:
    return create_access_token(data={"sub": str(user.id), "type": "access", "pv": password_fingerprint(user.hashed_password)})

def _user_from_token(token: str, session: Session) -> Optional[models.User]:
    """Usuario activo del token de sesión, o None si el token no sirve para autenticar."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None
    # Los tokens de verificación de email no son sesiones
    if payload.get("type", "access") != "access":
        return None
    user = session.get(models.User, user_id)
    if user is None or not user.is_active:
        return None
    # Tokens emitidos antes de añadir "pv" se aceptan hasta que caduquen (24 h)
    if "pv" in payload and not hmac.compare_digest(payload["pv"], password_fingerprint(user.hashed_password)):
        return None
    return user

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme), session: Session = Depends(get_session)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = _user_from_token(credentials.credentials, session)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user

def require_role(required_roles: list):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in required_roles:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied. Required roles: {required_roles}"
            )
        return current_user
    return role_checker

def get_user_or_none(credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme), session: Session = Depends(get_session)):
    if not credentials:
        return None
    return _user_from_token(credentials.credentials, session)
