"""Borrado de usuarios junto con los datos que dependen de ellos."""
from sqlalchemy import delete, or_, update
from sqlmodel import Session

import models


def delete_user(session: Session, user: models.User) -> None:
    """Borra el usuario y su actividad. Sus anuncios se conservan sin propietario para que el admin decida."""
    uid = user.id
    for model, column in (
        (models.Favorite, models.Favorite.user_id),
        (models.SavedSearch, models.SavedSearch.user_id),
        (models.GameScore, models.GameScore.user_id),
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
