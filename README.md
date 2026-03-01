# Ubica v2 — Plataforma Inmobiliaria Enterprise

Portal inmobiliario con frontend React (Vite) y backend FastAPI. El backend usa datos en memoria (sin base de datos externa).

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
ubica_v2/
├── ubica-backend/        # API FastAPI (Python)
│   ├── main.py           # Servidor principal
│   └── requirements.txt  # Dependencias Python
├── ubica-portal/         # Frontend React + Vite (TypeScript)
│   ├── package.json      # Dependencias Node (usa pnpm)
│   ├── .env.local        # Variables de entorno del frontend
│   └── src/              # Código fuente React
└── README.md
```

---

## Levantar el proyecto

Se necesitan **dos terminales** (backend + frontend).

### 1. Backend (FastAPI) — Puerto 8000

```bash
cd ubica-backend
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

El frontend usa el archivo `ubica-portal/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_USE_MOCK_API=false
```

No se necesita configuración adicional para desarrollo local.

---

## Usuarios de prueba

| Rol        | Email                          | Contraseña   |
|------------|-------------------------------|--------------|
| Admin      | admin@amifincas.es            | admin123     |
| Realtor    | inmobiliaria1@amifincas.es    | realtor123   |
| Investor   | inversor1@amifincas.es        | investor123  |

---

## Notas importantes

- El backend almacena datos **en memoria**. Al reiniciar se pierden las propiedades creadas durante la sesión (las propiedades base se recargan desde `ubica-portal/public/propertiesMurcia.json`).
- CORS está configurado para aceptar cualquier origen (`*`), apto solo para desarrollo.
- En **Windows**, si PowerShell bloquea la ejecución de scripts (`UnauthorizedAccess`), ejecutar los comandos con `cmd /c "..."` como se indica arriba.
