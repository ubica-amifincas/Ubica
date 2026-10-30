"""Roles del equipo y borrado de usuarios junto con los datos que dependen de ellos."""
from typing import Optional

from sqlalchemy import delete, or_, update
from sqlmodel import Session

import models
from config import STAFF_ROLES

ROLE_RANK = {"user": 0, "investor": 0, "realtor": 1, "admin": 2}


def staff_role(email: str) -> Optional[str]:
    return STAFF_ROLES.get((email or "").strip().lower())


def apply_staff_role(user: models.User) -> bool:
    """
    Da su rol a una cuenta del equipo (STAFF_ROLES). Solo sube permisos: un admin sigue siendo admin.
    Llamar solo cuando el correo está demostrado (verificado o confirmado por Google). Devuelve si cambió algo.
    """
    role = staff_role(user.email)
    if not role:
        return False
    changed = False
    if ROLE_RANK.get(role, 0) > ROLE_RANK.get(user.role, 0):
        user.role = role
        changed = True
    if user.role == "realtor" and not user.is_approved:
        user.is_approved = True
        changed = True
    return changed


def delete_user(session: Session, user: models.User) -> None:
    """Borra el usuario y su actividad. Sus anuncios se conservan sin propietario para que el admin decida."""
    uid = user.id
    for model, column in (
        (models.Favorite, models.Favorite.user_id),
        (models.SavedSearch, models.SavedSearch.user_id),
        (models.GameScore, models.GameScore.user_id),
        (models.TasadorGuess, models.TasadorGuess.user_id),
        (models.PortfolioProperty, models.PortfolioProperty.user_id),
        (models.PortfolioItem, models.PortfolioItem.user_id),
        (models.AIConversation, models.AIConversation.user_id),
        (models.Investment, models.Investment.investor_id),
    ):
        session.execute(delete(model).where(column == uid))
    # Una conversación con un usuario que ya no existe no se puede continuar
    session.execute(delete(models.Message).where(or_(models.Message.user_id == uid, models.Message.receiver_id == uid)))
    session.execute(update(models.Property).where(models.Property.owner_id == uid).values(owner_id=None))
    session.execute(update(models.Property).where(models.Property.realtor_id == uid).values(realtor_id=None))
    session.delete(user)
    session.commit()
