import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# La conexión sale de DATABASE_URL (.env), nunca de credenciales en el código.
DATABASE_URL = os.environ["DATABASE_URL"].replace("postgresql+psycopg2://", "postgresql://")

print(f"Testing connection to Supabase...")

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("Connection successful!")
    cur = conn.cursor()
    cur.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    cur.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
    conn.commit()
    print("Extensions created successfully!")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
