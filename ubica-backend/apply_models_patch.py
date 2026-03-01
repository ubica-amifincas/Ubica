import re

with open(r"d:\Proyects\Ubica_proyect\ubica_v2\ubica-backend\main.py", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Models
models_schema = """class Property(BaseModel):
    id: int
"""
if "class Favorite(BaseModel):" not in content:
    new_models = """class Favorite(BaseModel):
    id: int
    user_id: int
    property_id: int
    created_at: datetime = Field(default_factory=datetime.now)

class Message(BaseModel):
    id: int
    user_id: int
    property_id: Optional[int] = None
    realtor_id: Optional[int] = None
    content: str
    status: str = "unread"
    created_at: datetime = Field(default_factory=datetime.now)

class SavedSearch(BaseModel):
    id: int
    user_id: int
    name: str
    filters: str # JSON string for simplicity
    created_at: datetime = Field(default_factory=datetime.now)

class Property(BaseModel):
    id: int"""
    content = content.replace(models_schema, new_models)


# 2. Add Database files & Memory Lists
db_setup = """# Directorio de bases de datos JSON
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
USERS_FILE = os.path.join(DB_DIR, "users.json")
PROPERTIES_FILE = os.path.join(DB_DIR, "properties.json")
FAVORITES_FILE = os.path.join(DB_DIR, "favorites.json")
MESSAGES_FILE = os.path.join(DB_DIR, "messages.json")
SEARCHES_FILE = os.path.join(DB_DIR, "searches.json")

# Base de datos en memoria (cargadas al vuelo)
users_db: List[UserInDB] = []
properties_db: List[Property] = []
investments_db: List[Investment] = []
favorites_db: List[Favorite] = []
messages_db: List[Message] = []
searches_db: List[SavedSearch] = []"""

old_db_setup = """# Directorio de bases de datos JSON
DB_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DB_DIR, exist_ok=True)
USERS_FILE = os.path.join(DB_DIR, "users.json")
PROPERTIES_FILE = os.path.join(DB_DIR, "properties.json")

# Base de datos en memoria (cargadas al vuelo)
users_db: List[UserInDB] = []
properties_db: List[Property] = []
investments_db: List[Investment] = []"""

if "favorites_db: List[Favorite]" not in content:
    content = content.replace(old_db_setup, db_setup)

# 3. Update save_db and load_db
save_db_old = """def save_db():
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump([u.dict() for u in users_db], f, default=str, indent=2)
    with open(PROPERTIES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in properties_db], f, default=str, indent=2)"""

save_db_new = """def save_db():
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump([u.dict() for u in users_db], f, default=str, indent=2)
    with open(PROPERTIES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in properties_db], f, default=str, indent=2)
    with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in favorites_db], f, default=str, indent=2)
    with open(MESSAGES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in messages_db], f, default=str, indent=2)
    with open(SEARCHES_FILE, "w", encoding="utf-8") as f:
        json.dump([p.dict() for p in searches_db], f, default=str, indent=2)"""

if "FAVORITES_FILE" not in save_db_old and "FAVORITES_FILE" not in content.replace(save_db_old, save_db_new):
    pass
    # I'll use regex for exact replacement later if needed

content = content.replace(save_db_old, save_db_new)

load_db_new_lines = """
    # --- Cargar Favoritos, Mensajes, Busquedas ---
    global favorites_db, messages_db, searches_db
    if os.path.exists(FAVORITES_FILE):
        with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            favorites_db = [Favorite(**d) for d in data]
    if os.path.exists(MESSAGES_FILE):
        with open(MESSAGES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            messages_db = [Message(**d) for d in data]
    if os.path.exists(SEARCHES_FILE):
        with open(SEARCHES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            searches_db = [SavedSearch(**d) for d in data]
"""

# inject at the end of load_db
load_db_injection_point = """            print(f"Error loading properties: {e}")
            
    # Guardar por si acabamos de generar los datos por defecto
    save_db()"""

if "global favorites_db, messages_db, searches_db" not in content:
    content = content.replace(load_db_injection_point, load_db_injection_point.replace("save_db()", load_db_new_lines + "\n    save_db()"))

with open(r"d:\Proyects\Ubica_proyect\ubica_v2\ubica-backend\patch_models.py", "w", encoding="utf-8") as f:
    f.write(content)
print("done")
