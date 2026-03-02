import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Use Transaction Pooler connection string from Supabase
if not DATABASE_URL:
    # Fallback or error if not set
    DATABASE_URL = "postgresql://postgres:password@localhost:5432/postgres"

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    from . import models # Ensure models are loaded
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
