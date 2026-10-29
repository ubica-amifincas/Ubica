"""Área del usuario: sus propiedades, favoritos, búsquedas guardadas y mensajes."""
import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

import models
from database import get_session
from security import get_current_user
from services.properties import apply_property_payload, property_from_payload

router = APIRouter()

@router.get("/api/user/properties", response_model=List[models.Property])
async def get_user_properties(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role == "admin":
        return session.exec(select(models.Property)).all()
    return session.exec(select(models.Property).where(models.Property.owner_id == current_user.id)).all()

@router.post("/api/user/properties", response_model=models.Property)
async def create_user_property(prop_data: dict, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    new_property = property_from_payload(prop_data, current_user.id, default_status='for-sale')
    session.add(new_property)
    session.commit()
    session.refresh(new_property)
    return new_property

@router.put("/api/user/properties/{property_id}", response_model=models.Property)
async def update_user_property(property_id: int, prop_data: dict, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = session.get(models.Property, property_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    
    # Solo el owner o un admin puede editar
    if p.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para editar esta propiedad")
    
    apply_property_payload(p, prop_data)
    
    session.add(p)
    session.commit()
    session.refresh(p)
    return p

@router.delete("/api/user/properties/{property_id}")
async def delete_user_property(property_id: int, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    p = session.get(models.Property, property_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    if p.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar esta propiedad")
    session.delete(p)
    session.commit()
    return {"message": "Propiedad eliminada con éxito"}

@router.get("/api/user/favorites", response_model=List[models.Property])
async def get_favorites(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    statement = select(models.Property).join(models.Favorite).where(models.Favorite.user_id == current_user.id)
    return session.exec(statement).all()

@router.post("/api/user/favorites/{property_id}")
async def add_favorite(property_id: int, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    existing = session.exec(select(models.Favorite).where(models.Favorite.property_id == property_id, models.Favorite.user_id == current_user.id)).first()
    if existing:
        return {"message": "Already in favorites"}
    
    new_fav = models.Favorite(user_id=current_user.id, property_id=property_id)
    session.add(new_fav)
    session.commit()
    return {"message": "Added to favorites"}

@router.delete("/api/user/favorites/{property_id}")
async def remove_favorite(property_id: int, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    fav = session.exec(select(models.Favorite).where(models.Favorite.property_id == property_id, models.Favorite.user_id == current_user.id)).first()
    if fav:
        session.delete(fav)
        session.commit()
    return {"message": "Removed from favorites"}

# --- Búsquedas guardadas ---
@router.get("/api/user/searches")
async def get_searches(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    searches = session.exec(select(models.SavedSearch).where(models.SavedSearch.user_id == current_user.id)).all()
    return [{"id": s.id, "name": s.name, "filters": json.loads(s.filters or "{}"), "created_at": s.created_at} for s in searches]

@router.post("/api/user/searches")
async def add_search(search_data: dict, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    new_search = models.SavedSearch(
        user_id=current_user.id,
        name=search_data.get("name", "Búsqueda Guardada"),
        filters=json.dumps(search_data.get("filters", {}))
    )
    session.add(new_search)
    session.commit()
    session.refresh(new_search)
    return {"message": "Búsqueda guardada", "id": new_search.id}

@router.delete("/api/user/searches/{search_id}")
async def remove_search(search_id: int, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    search = session.get(models.SavedSearch, search_id)
    if search and search.user_id == current_user.id:
        session.delete(search)
        session.commit()
    return {"message": "Búsqueda eliminada"}

# --- Mensajes: enviados por el usuario actual ---

@router.get("/api/user/messages", response_model=List[models.Message])
async def get_messages(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(models.Message).where(models.Message.user_id == current_user.id)).all()

@router.get("/api/user/messages/received", response_model=List[models.Message])
async def get_received_messages(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    return session.exec(select(models.Message).where(models.Message.receiver_id == current_user.id)).all()

@router.get("/api/user/conversations")
async def get_conversations(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Simpler version for DB: just return all relevant messages for now
    # UI expected a list of threads
    my_msgs = session.exec(select(models.Message).where((models.Message.user_id == current_user.id) | (models.Message.receiver_id == current_user.id))).all()
    # Logic to group into threads (same as before but with DB objects)
    threads: dict = {}
    for m in my_msgs:
        other_id = m.receiver_id if m.user_id == current_user.id else m.user_id
        key = f"{m.property_id}_{other_id}"
        if key not in threads:
            other_user = session.get(models.User, other_id)
            threads[key] = {
                "property_id": m.property_id,
                "property_title": m.property_title or "Propiedad",
                "other_user_id": other_id,
                "other_user_name": other_user.full_name if other_user else "Usuario",
                "messages": [],
                "unread_count": 0,
            }
        msg_dict = m.model_dump()
        msg_dict["is_mine"] = m.user_id == current_user.id
        threads[key]["messages"].append(msg_dict)
        if not msg_dict["is_mine"] and m.status != "read":
            threads[key]["unread_count"] += 1
    return list(threads.values())

@router.post("/api/user/messages")
async def add_message(msg_data: dict, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Determinar receiver_id: el owner de la propiedad
    receiver_id = msg_data.get("receiver_id")
    property_title = None
    prop_id = msg_data.get("property_id")
    if prop_id:
        prop = session.get(models.Property, prop_id)
        if prop:
            property_title = prop.title
            if not receiver_id:
                receiver_id = prop.owner_id
    
    new_msg = models.Message(
        user_id=current_user.id,
        receiver_id=receiver_id,
        property_id=prop_id,
        realtor_id=msg_data.get("realtor_id"),
        sender_name=current_user.full_name or current_user.email,
        property_title=property_title,
        content=msg_data.get("content", ""),
        status="pending"
    )
    session.add(new_msg)
    session.commit()
    session.refresh(new_msg)
    return {"message": "Mensaje enviado", "id": new_msg.id}

@router.post("/api/user/messages/{message_id}/reply")
async def reply_message(message_id: int, msg_data: dict, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Buscar el mensaje original
    original = session.get(models.Message, message_id)
    if not original:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    
    new_msg = models.Message(
        user_id=current_user.id,
        receiver_id=original.user_id,  # responder al emisor original
        property_id=original.property_id,
        realtor_id=original.realtor_id,
        sender_name=current_user.full_name or current_user.email,
        property_title=original.property_title,
        content=msg_data.get("content", ""),
        status="pending"
    )
    # Marcar el mensaje original como respondido
    original.status = "replied"
    
    session.add(new_msg)
    session.add(original)
    session.commit()
    session.refresh(new_msg)
    return {"message": "Respuesta enviada", "id": new_msg.id}
