import os
import json
from datetime import datetime
from sqlmodel import Session, create_engine, SQLModel, select
from models import User, Property, Message, Favorite, SavedSearch, Investment
from dotenv import load_dotenv

load_dotenv()

# Cloud Connection (Transaction Pooler for Supabase)
# We use the password provided by the user: 3Ki^e48^P1K2%%&0
# Host: aws-1-eu-north-1.pooler.supabase.com
# User: postgres.iklqjuiodvmeynbcimwq
# Note: psycopg2/SQLModel might need percent-encoding for the password if used in a URL string, 
# but SQLModel's create_engine handles it if passed correctly.
DB_USER = "postgres.iklqjuiodvmeynbcimwq"
DB_PASS = "3Ki^e48^P1K2%%&0"
DB_HOST = "aws-1-eu-north-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"

CLOUD_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(CLOUD_DATABASE_URL, echo=True)

# Directorio de datos JSON local
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
        print("Migrated Users to Cloud")

def migrate_properties(session: Session):
    path = os.path.join(DB_DIR, "properties.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for item in data:
                # Check if property exists by ID
                existing = session.get(Property, item.get("id")) if item.get("id") else None
                if not existing:
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
        print("Migrated Properties to Cloud")

def run_cloud_migration():
    print("Starting Cloud migration to Supabase...")
    # SQLModel should create tables based on models.py
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        migrate_users(session)
        migrate_properties(session)
    
    print("Cloud Migration finished!")

if __name__ == "__main__":
    run_cloud_migration()
