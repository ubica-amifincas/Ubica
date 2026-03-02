import json
import os
from datetime import datetime
from sqlmodel import Session, create_engine, select
from models import User, Property, Message, Favorite, SavedSearch, Investment
from database import engine

# Directorio de bases de datos JSON
DB_DIR = os.path.join(os.path.dirname(__file__), "data")

def parse_date(date_str):
    if not date_str or date_str == "None":
        return datetime.now()
    try:
        return datetime.fromisoformat(date_str)
    except:
        return datetime.now()

def migrate_users(session: Session):
    path = os.path.join(DB_DIR, "users.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                # Evitar duplicados por email
                existing = session.exec(select(User).where(User.email == item["email"])).first()
                if not existing:
                    user = User(
                        id=item.get("id"),
                        email=item["email"],
                        hashed_password=item["hashed_password"],
                        full_name=item.get("full_name"),
                        role=item.get("role", "user"),
                        company=item.get("company"),
                        phone=item.get("phone"),
                        is_active=item.get("is_active", True),
                        is_verified=item.get("is_verified", True),
                        created_at=parse_date(item.get("created_at")),
                        updated_at=parse_date(item.get("updated_at"))
                    )
                    session.add(user)
        session.commit()
        print("Migrated Users")

def migrate_properties(session: Session):
    path = os.path.join(DB_DIR, "properties.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                # Evitar duplicados por ID (si se mantienen los mismos)
                prop = Property(
                    id=item.get("id"),
                    title=item["title"],
                    price=item["price"],
                    type=item["type"],
                    status=item.get("status", "available"),
                    bedrooms=item.get("bedrooms"),
                    bathrooms=item.get("bathrooms"),
                    area=item.get("area"),
                    latitude=item.get("latitude"),
                    longitude=item.get("longitude"),
                    address=item.get("address"),
                    city=item.get("city"),
                    region=item.get("region", "Murcia"),
                    description=item.get("description"),
                    images=item.get("images", []),
                    features=item.get("features", []),
                    year_built=item.get("year_built"),
                    energy_rating=item.get("energy_rating"),
                    orientation=item.get("orientation"),
                    purchase_price=item.get("purchase_price", 0),
                    total_cost=item.get("total_cost", 0),
                    monthly_cost=item.get("monthly_cost", 0),
                    monthly_income=item.get("monthly_income", 0),
                    owner_id=item.get("owner_id"),
                    realtor_id=item.get("realtor_id"),
                    created_at=parse_date(item.get("created_at")),
                    updated_at=parse_date(item.get("updated_at"))
                )
                session.add(prop)
        session.commit()
        print("Migrated Properties")

# Se pueden añadir más funciones para favoritios, mensajes, etc si existen datos

def run_migration():
    print("Starting migration...")
    from sqlmodel import SQLModel
    # Crear tablas si no existen
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        migrate_users(session)
        migrate_properties(session)
        # Añadir otros si es necesario
    
    print("Migration finished!")

if __name__ == "__main__":
    run_migration()
