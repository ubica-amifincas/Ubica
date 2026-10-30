import os
from sqlmodel import create_engine, Session, SQLModel
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Use Transaction Pooler connection string from Supabase
if not DATABASE_URL:
    # Fallback or error if not set
    DATABASE_URL = "postgresql://postgres:password@localhost:5432/postgres"

# SQLAlchemy 2.1 usa psycopg (v3) por defecto para "postgresql://"; el proyecto instala psycopg2
for prefix in ("postgres://", "postgresql://"):
    if DATABASE_URL.startswith(prefix):
        DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len(prefix):]
        break

# SQLite (tests) necesita compartir la conexión entre hilos
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=os.getenv("SQL_ECHO") == "1", connect_args=connect_args)

def create_db_and_tables():
    from . import models # Ensure models are loaded
    SQLModel.metadata.create_all(engine)

# Columnas añadidas después de crear las tablas en producción (create_all no altera tablas existentes).
# Solo se añaden si faltan; nunca se borra ni se cambia nada.
ADDED_COLUMNS = {
    "user": {"is_approved": "BOOLEAN NOT NULL DEFAULT TRUE", "terms_accepted_at": "TIMESTAMP"},
    "property": {"pending_status": "VARCHAR", "review_note": "VARCHAR"},
}

def ensure_columns():
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, columns in ADDED_COLUMNS.items():
            if not inspector.has_table(table):
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in existing:
                    conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN {name} {ddl}'))
                    print(f"[DB] Columna añadida: {table}.{name}")

# Tablas nuevas: se crean al arrancar si faltan (las existentes no se tocan). En Postgres (Supabase) se les
# activa RLS como al resto (enable_rls.sql): sin políticas, la API REST pública de Supabase no puede leerlas.
NEW_TABLES = ("tasadorguess", "portfolioproperty", "portfolioitem")

def ensure_tables():
    from sqlalchemy import inspect, text
    import models  # noqa: F401  (registra las tablas en el metadata)
    inspector = inspect(engine)
    missing = [t for t in NEW_TABLES if not inspector.has_table(t)]
    if not missing:
        return
    SQLModel.metadata.create_all(engine, tables=[SQLModel.metadata.tables[t] for t in missing])
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            for t in missing:
                conn.execute(text(f'alter table public."{t}" enable row level security'))
    print(f"[DB] Tablas creadas: {', '.join(missing)}")

def get_session():
    with Session(engine) as session:
        yield session
