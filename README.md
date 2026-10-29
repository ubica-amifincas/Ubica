# Ubica v2 — Plataforma Inmobiliaria Enterprise

Portal inmobiliario con frontend React (Vite, desplegado en Vercel) y backend FastAPI (desplegado en Render) sobre PostgreSQL en Supabase.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|---------------|
| **Node.js** | 18+           |
| **pnpm**    | 9+            |
| **Python**  | 3.10+         |

---

## Estructura del proyecto

```
Ubica/
├── ubica-backend/          # API FastAPI (Python) — desplegada en Render
│   ├── main.py             # Servidor y endpoints
│   ├── models.py           # Modelos SQLModel (tablas de Supabase)
│   ├── database.py         # Conexión a Postgres (DATABASE_URL)
│   ├── mcp_server.py       # Herramientas del chat de IA
│   ├── setup_cloud_db.sql  # Esquema inicial de la base de datos
│   ├── enable_rls.sql      # Activa RLS en las tablas
│   └── requirements.txt    # Dependencias (versiones fijadas)
├── ubica-portal/           # Frontend React + Vite (TypeScript) — desplegado en Vercel
│   ├── src/                # Código fuente
│   └── public/             # Estáticos
├── sample_import.csv       # Ejemplo para importar propiedades desde el panel de admin
├── render.yaml             # Configuración del servicio en Render
└── README.md
```

---

## Levantar el proyecto

Se necesitan **dos terminales** (backend + frontend).

### 1. Backend (FastAPI) — Puerto 8000

```bash
cd ubica-backend
python -m venv .venv
.venv\Scripts\activate        # Windows (en Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
```

**Iniciar el servidor:**

```bash
# Linux / macOS
python main.py

# Windows (necesario para emojis en consola)
cmd /c "set PYTHONIOENCODING=utf-8 && python main.py"
```

El backend estará disponible en:
- API: `http://localhost:8000`
- Documentación Swagger: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend (Vite + React) — Puerto 5173

```bash
cd ubica-portal
```

**Iniciar el servidor de desarrollo:**

```bash
# Linux / macOS
pnpm run dev

# Windows (si PowerShell bloquea scripts)
cmd /c "pnpm run dev"
```

El frontend estará disponible en: `http://localhost:5173`

> **Nota:** El script `dev` ejecuta `pnpm install` automáticamente antes de iniciar Vite, por lo que no es necesario instalar dependencias manualmente.

---

## Variables de entorno

**Backend** (`ubica-backend/.env`, ver `.env.example`; en producción se configuran en Render):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión de Supabase (Transaction Pooler, puerto 6543) |
| `JWT_SECRET_KEY` | Secreto para firmar los tokens. **Obligatoria en Render**; en local se genera una temporal |
| `RESEND_API_KEY` | API key de Resend para los correos. Vacía en local = no se envían correos |
| `FRONTEND_URL` | URL pública del frontend (enlaces de verificación) |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` | Proveedores del chat de IA |

**Frontend** (`ubica-portal/.env.local`):

```env
VITE_API_URL=http://localhost:8000/api
```

Nunca subas credenciales al repositorio: los `.env` están en `.gitignore`.

---

## Usuarios

Los usuarios viven en la base de datos de Supabase. No hay credenciales de prueba publicadas: créalos desde el panel de administración.

---

## Notas importantes

- En local el backend usa la base de datos indicada en `DATABASE_URL`: si apunta a producción, los cambios se ven en la web real.
- En **Windows**, si PowerShell bloquea la ejecución de scripts (`UnauthorizedAccess`), ejecutar los comandos con `cmd /c "..."` como se indica arriba.
