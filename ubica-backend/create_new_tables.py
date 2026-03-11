from sqlmodel import SQLModel
from database import engine
import models

def create_db_and_tables():
    print("Creating tables...")
    SQLModel.metadata.create_all(engine)
    print("Tables created.")

if __name__ == "__main__":
    create_db_and_tables()
