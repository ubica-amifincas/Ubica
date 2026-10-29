"""Panel de administración: usuarios, propiedades e importación (solo rol admin)."""
import io
import re
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlmodel import Session, func, select

import models
from database import get_session
from schemas import AdminUserCreate, AdminUserUpdate, DashboardStats, User
from security import hash_password, require_role
from services.properties import (PROPERTY_STATUSES, apply_property_payload, assign_realtor, count_status_this_month,
                                 delete_property as delete_property_and_data, normalize_property_type, property_from_payload)
from services.users import delete_user as delete_user_and_data

router = APIRouter()

@router.get("/api/admin/dashboard", response_model=DashboardStats)
async def get_admin_dashboard(current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    total_properties = session.exec(select(func.count(models.Property.id))).one()
    total_users = session.exec(select(func.count(models.User.id))).one()
    total_transactions, total_revenue, average_roi = session.exec(select(
        func.count(models.Investment.id), func.sum(models.Investment.investment_amount), func.avg(models.Investment.roi_percentage))).one()

    users_by_role = {role: 0 for role in ("admin", "realtor", "investor", "user")}
    for role, n in session.exec(select(models.User.role, func.count(models.User.id)).group_by(models.User.role)).all():
        users_by_role[role] = users_by_role.get(role, 0) + n
    properties_by_status = dict(session.exec(select(models.Property.status, func.count(models.Property.id)).group_by(models.Property.status)).all())

    return DashboardStats(
        total_properties=total_properties,
        total_users=total_users,
        total_transactions=total_transactions,
        total_revenue=float(total_revenue or 0),
        properties_sold_this_month=count_status_this_month(session, "sold"),
        properties_rented_this_month=count_status_this_month(session, "rented"),
        average_roi=float(average_roi or 0),
        market_growth=0.0,
        users_by_role=users_by_role,
        properties_by_status=properties_by_status,
    )

@router.get("/api/admin/users", response_model=List[User])
async def get_all_users(current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    return session.exec(select(models.User)).all()

@router.post("/api/admin/users", response_model=User)
async def create_user(user_data: AdminUserCreate, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
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
        is_active=user_data.is_active,
        is_verified=True
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

def _is_last_active_admin(session: Session, u: models.User) -> bool:
    if u.role != "admin" or not u.is_active:
        return False
    admins = session.exec(select(func.count(models.User.id)).where(models.User.role == "admin", models.User.is_active == True)).one()  # noqa: E712
    return admins <= 1

@router.put("/api/admin/users/{user_id}", response_model=User)
async def update_user(user_id: int, user_data: AdminUserUpdate, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    u = session.get(models.User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    changes = user_data.model_dump(exclude_unset=True)

    loses_admin = changes.get("role", "admin") != "admin" or changes.get("is_active") is False
    if loses_admin and _is_last_active_admin(session, u):
        raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador activo")

    new_email = changes.pop("email", None)
    if new_email and new_email != u.email:
        existing = session.exec(select(models.User).where(models.User.email == new_email, models.User.id != user_id)).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está registrado por otro usuario")
        u.email = new_email

    new_password = changes.pop("password", None)
    if new_password:
        u.hashed_password = hash_password(new_password)
    for field, value in changes.items():
        # Rol y estado no se pueden vaciar; los datos de contacto sí
        if value is not None or field in ("full_name", "company", "phone"):
            setattr(u, field, value)
        
    u.updated_at = datetime.now()
    session.add(u)
    session.commit()
    session.refresh(u)
    return u

@router.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: int, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
    u = session.get(models.User, user_id)
    if u is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    delete_user_and_data(session, u)
    return {"message": "Usuario eliminado con éxito"}

@router.get("/api/admin/properties", response_model=List[models.Property])
async def get_all_properties_admin(current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    return session.exec(select(models.Property)).all()

IMPORT_MAX_BYTES = 10 * 1024 * 1024
# La plantilla del panel usa los estados en español
IMPORT_STATUS_ALIASES = {
    "en venta": "for-sale", "venta": "for-sale", "en alquiler": "for-rent", "alquiler": "for-rent",
    "reservado": "reserved", "reservada": "reserved", "vendido": "sold", "vendida": "sold",
    "alquilado": "rented", "alquilada": "rented",
}


@router.post("/api/admin/properties/import")
async def import_properties(file: UploadFile = File(...), current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    content = await file.read(IMPORT_MAX_BYTES + 1)
    if len(content) > IMPORT_MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo puede ocupar como máximo 10 MB")
    name = (file.filename or "").lower()
    try:
        import pandas as pd
        if name.endswith('.csv'):
            # sep=None: detecta coma o punto y coma (Excel en español exporta con ';')
            # dtype=str: los números se interpretan abajo ("150.000" es 150000 en España, no 150)
            df = pd.read_csv(io.BytesIO(content), sep=None, engine="python", encoding="utf-8-sig", dtype=str)
        elif name.endswith('.json'):
            df = pd.read_json(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Formato no soportado: sube un CSV o un JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error leyendo el archivo: {str(e)}")

    df.columns = df.columns.astype(str).str.lower().str.strip()

    properties_added = 0
    errors = []

    def cell(row, *names, default=None):
        # Celdas vacías llegan como NaN: se tratan como ausentes. Se aceptan nombres en inglés y en español
        for name in names:
            value = row.get(name)
            if value is not None and pd.notna(value) and str(value).strip() != "":
                return value
        return default

    def number(row, *names, cast=float):
        value = cell(row, *names)
        if value is None:
            return None
        text = str(value).replace("€", "").replace(" ", "").strip()
        if re.fullmatch(r"\d{1,3}(\.\d{3})+(,\d+)?", text):
            text = text.replace(".", "").replace(",", ".")  # 150.000 / 1.250.000,50
        else:
            text = text.replace(",", ".")  # 85,5
        try:
            return cast(float(text))
        except ValueError:
            raise ValueError(f"'{value}' no es un número ({names[0]})")

    for index, row in df.iterrows():
        try:
            price = number(row, 'price', 'precio')
            if price is None or price <= 0:
                raise ValueError("falta el precio")
            status = str(cell(row, 'status', 'estado', default='for-sale')).strip()
            status = IMPORT_STATUS_ALIASES.get(status.lower(), status)
            if status not in PROPERTY_STATUSES:
                raise ValueError(f"estado no válido '{status}'")
            images = cell(row, 'images', 'imagenes', 'imágenes', 'fotos', default='')
            image_urls = [u.strip() for u in str(images).replace('|', ',').split(',') if u.strip().startswith(('http://', 'https://'))]
            lat, lng = number(row, 'latitude', 'latitud', 'lat'), number(row, 'longitude', 'longitud', 'lng')
            # Lo que no viene en el archivo queda vacío: no se inventan habitaciones ni metros
            new_property = models.Property(
                title=str(cell(row, 'title', 'titulo', 'título', default='Propiedad importada'))[:200],
                price=price,
                type=normalize_property_type(cell(row, 'type', 'tipo', default='house')),
                status=status,
                bedrooms=number(row, 'bedrooms', 'habitaciones', 'dormitorios', cast=int),
                bathrooms=number(row, 'bathrooms', 'baños', 'banos', cast=int),
                area=number(row, 'area', 'superficie', 'metros', 'm2'),
                city=str(cell(row, 'location', 'city', 'ciudad', 'municipio', 'localidad', default='')),
                address=str(cell(row, 'address', 'direccion', 'dirección', default='')),
                description=str(cell(row, 'description', 'descripcion', 'descripción', default='')),
                latitude=lat,
                longitude=lng,
                region="Murcia",
                images=image_urls,
                owner_id=current_user.id
            )
            session.add(new_property)
            properties_added += 1
        except Exception as e:
            errors.append(f"Fila {index + 2}: {str(e)}")

    session.commit()
    return {"message": "Importación completada", "properties_added": properties_added, "errors": len(errors), "error_details": errors[:20]}

@router.post("/api/admin/properties", response_model=models.Property)
async def create_property(prop_data: dict, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    new_property = property_from_payload(prop_data, current_user.id, default_status='for-sale')
    if "realtor_id" in prop_data:
        assign_realtor(session, new_property, prop_data["realtor_id"])
    session.add(new_property)
    session.commit()
    session.refresh(new_property)
    return new_property

@router.put("/api/admin/properties/{property_id}", response_model=models.Property)
async def update_property(property_id: int, prop_data: dict, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    p = session.get(models.Property, property_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
        
    apply_property_payload(p, prop_data)
    if "realtor_id" in prop_data:
        assign_realtor(session, p, prop_data["realtor_id"])
    
    session.add(p)
    session.commit()
    session.refresh(p)
    return p

@router.delete("/api/admin/properties/{property_id}")
async def delete_property(property_id: int, current_user: models.User = Depends(require_role(["admin"])), session: Session = Depends(get_session)):
    p = session.get(models.Property, property_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Propiedad no encontrada")
    delete_property_and_data(session, p)
    return {"message": "Propiedad eliminada con éxito"}
