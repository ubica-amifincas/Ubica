import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Cloud connection parameters (Transaction Pooler)
params = {
    "host": "aws-1-eu-north-1.pooler.supabase.com",
    "user": "postgres.iklqjuiodvmeynbcimwq",
    "password": "3Ki^e48^P1K2%%&0",
    "dbname": "postgres",
    "port": 6543
}

print(f"Testing connection to Supabase...")

try:
    conn = psycopg2.connect(**params)
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
