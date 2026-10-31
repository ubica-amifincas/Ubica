"""Redes sociales: publicar el vídeo de un inmueble en el Instagram de AMI Fincas, con aprobación del equipo.

Solo el equipo de AMI (administradores y las cuentas de STAFF_ROLES): las inmobiliarias externas también tienen
el rol «realtor» y no deben publicar en las redes de AMI.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import Session, select

import models
from config import STAFF_ROLES
from database import get_session
from security import get_current_user
from services import instagram

router = APIRouter()

PUBLISHABLE_STATUSES = ("for-sale", "for-rent")
# Una publicación que lleva más que esto «publicando» se interrumpió (p. ej. reinicio del servidor)
STUCK_AFTER = timedelta(minutes=15)

VIDEO_MESSAGES = {
    "missing": "El vídeo de este inmueble aún no está listo: se genera en menos de una hora tras subir las fotos.",
    "outdated": "Las fotos o el precio han cambiado y el vídeo se está rehaciendo: inténtalo en menos de una hora.",
}


def require_ami_staff(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role == "admin" or (current_user.email or "").lower() in STAFF_ROLES:
        return current_user
    raise HTTPException(status_code=403, detail="Solo el equipo de AMI Fincas puede publicar en sus redes")


class InstagramPublish(BaseModel):
    caption: str = Field(min_length=1, max_length=instagram.CAPTION_MAX)


def _latest(session: Session, property_id: int) -> models.SocialPost | None:
    post = session.exec(select(models.SocialPost)
                        .where(models.SocialPost.property_id == property_id, models.SocialPost.network == "instagram")
                        .order_by(models.SocialPost.id.desc())).first()
    if post and post.status == "publishing" and datetime.now() - post.created_at > STUCK_AFTER:
        post.status, post.error = "error", "La publicación se interrumpió. Inténtalo de nuevo."
        session.add(post)
        session.commit()
    return post


def _out(post: models.SocialPost | None) -> dict | None:
    if not post:
        return None
    return {"id": post.id, "status": post.status, "permalink": post.permalink, "error": post.error,
            "created_at": post.created_at, "published_at": post.published_at}


def _property(session: Session, property_id: int) -> models.Property:
    p = session.get(models.Property, property_id)
    if not p:
        raise HTTPException(status_code=404, detail="Inmueble no encontrado")
    return p


@router.get("/api/social/instagram/{property_id}")
async def instagram_status(property_id: int, current_user: models.User = Depends(require_ami_staff),
                           session: Session = Depends(get_session)):
    p = _property(session, property_id)
    entry = await instagram.video_entry(p.id)
    return {
        "configured": instagram.configured(),
        "publishable": p.status in PUBLISHABLE_STATUSES,
        "video": instagram.video_status(p, entry),
        "caption": instagram.build_caption(p),
        "post": _out(_latest(session, p.id)),
    }


@router.post("/api/social/instagram/{property_id}")
async def instagram_publish(property_id: int, data: InstagramPublish, background_tasks: BackgroundTasks,
                            current_user: models.User = Depends(require_ami_staff),
                            session: Session = Depends(get_session)):
    if not instagram.configured():
        raise HTTPException(status_code=503, detail="La cuenta de Instagram aún no está conectada")
    p = _property(session, property_id)
    if p.status not in PUBLISHABLE_STATUSES:
        raise HTTPException(status_code=409, detail="Solo se publican anuncios en venta o en alquiler")
    last = _latest(session, p.id)
    if last and last.status == "publishing":
        raise HTTPException(status_code=409, detail="Ya se está publicando en Instagram")
    if last and last.status == "published":
        raise HTTPException(status_code=409, detail="Este inmueble ya está publicado en Instagram")
    caption = data.caption.strip()
    if caption.count("#") > instagram.HASHTAGS_MAX:
        raise HTTPException(status_code=422, detail=f"Instagram admite como mucho {instagram.HASHTAGS_MAX} hashtags")
    entry = await instagram.video_entry(p.id)
    video = instagram.video_status(p, entry)
    if video != "ready":
        raise HTTPException(status_code=409, detail=VIDEO_MESSAGES[video])

    post = models.SocialPost(property_id=p.id, caption=caption, video_url=entry["vertical"], created_by=current_user.id)
    session.add(post)
    session.commit()
    session.refresh(post)
    background_tasks.add_task(instagram.publish_post, post.id)
    return _out(post)
