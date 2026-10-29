import hashlib
import os
import sys
import tempfile
from datetime import datetime, timedelta

import pytest

# Entorno aislado: SQLite temporal, sin correos ni proveedores de IA reales.
# Se fija antes de importar la app; load_dotenv() no sobrescribe variables ya definidas.
_tmp = tempfile.mkdtemp(prefix="ubica-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp, 'test.db')}"
os.environ["JWT_SECRET_KEY"] = "test-secret"
os.environ["RESEND_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["OPENROUTER_API_KEY"] = ""
os.environ["GEMINI_API_KEY"] = ""
os.environ["AI_USAGE_FILE"] = os.path.join(_tmp, "ai_usage.json")
os.environ["UPLOAD_DIR"] = os.path.join(_tmp, "uploads")
os.environ.pop("RENDER", None)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import event  # noqa: E402
from sqlmodel import Session, SQLModel  # noqa: E402

import models  # noqa: E402
from database import engine  # noqa: E402
from main import app  # noqa: E402


# Postgres (producción) aplica las claves foráneas; SQLite solo si se activan en cada conexión.
@event.listens_for(engine, "connect")
def _sqlite_foreign_keys_on(dbapi_connection, _record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


engine.dispose()  # por si alguna conexión se abrió antes de registrar el listener


def make_token(user_id: int, **extra) -> str:
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(minutes=30), **extra}
    return jwt.encode(payload, "test-secret", algorithm="HS256")


def auth(user) -> dict:
    return {"Authorization": f"Bearer {make_token(user.id)}"}


@pytest.fixture(autouse=True)
def fresh_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    ai_usage = os.environ["AI_USAGE_FILE"]
    if os.path.exists(ai_usage):
        os.remove(ai_usage)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    with Session(engine) as session:
        yield session


def _bcrypt(password: str) -> str:
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


@pytest.fixture
def make_user(db):
    def _make(email="user@example.com", role="user", password="secret123", verified=True, legacy=False, **kw):
        hashed = hashlib.sha256(password.encode()).hexdigest() if legacy else _bcrypt(password)
        user = models.User(email=email, role=role, hashed_password=hashed, is_verified=verified, **kw)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return _make


@pytest.fixture
def make_property(db):
    def _make(**kw):
        data = {"title": "Piso en Cartagena", "price": 150000, "type": "apartment", "status": "for-sale", "city": "Cartagena", "area": 90}
        data.update(kw)
        prop = models.Property(**data)
        db.add(prop)
        db.commit()
        db.refresh(prop)
        return prop
    return _make
