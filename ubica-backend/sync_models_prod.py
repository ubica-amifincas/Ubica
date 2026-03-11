from sqlmodel import create_engine, SQLModel
from models import *

DB_USER = "postgres.iklqjuiodvmeynbcimwq"
DB_PASS = "3Ki^e48^P1K2%%&0"
DB_HOST = "aws-1-eu-north-1.pooler.supabase.com"
DB_PORT = "6543"
DB_NAME = "postgres"

CLOUD_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(CLOUD_DATABASE_URL, echo=True)

if __name__ == "__main__":
    print("Creating tables on Production Supabase...")
    SQLModel.metadata.create_all(engine)
    print("Done!")
