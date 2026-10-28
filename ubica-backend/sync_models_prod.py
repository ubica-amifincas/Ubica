from sqlmodel import create_engine, SQLModel
from models import *

# La conexión sale de DATABASE_URL (.env), nunca de credenciales en el código.
from database import engine

if __name__ == "__main__":
    print("Creating tables on Production Supabase...")
    SQLModel.metadata.create_all(engine)
    print("Done!")
