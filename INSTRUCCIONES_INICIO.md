# Instrucciones para Levantar el Proyecto Ubica Enterprise

Este documento describe los pasos necesarios para iniciar tanto el backend como el frontend del proyecto.

## Requisitos Previos

- Python 3.10+ instalado.
- Node.js y npm instalados.
- Dependencias de Python instaladas (`pip install -r ubica-backend/requirements.txt`).
- Dependencias de Node instaladas en `ubica-portal` (usualmente `npm install`).

## Pasos para Iniciar

### 1. Iniciar el Backend (Servidor FastAPI)

Navega a la carpeta del backend y ejecuta el script principal:

```powershell
cd ubica-backend
python main.py
```

- **URL de la API:** [http://localhost:8000](http://localhost:8000)
- **Documentación Interactiva (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### 2. Iniciar el Frontend (Portal Web)

En una nueva terminal, navega a la carpeta del portal y arranca el servidor de desarrollo:

```powershell
cd ubica-portal
npx vite
```

- **URL del Portal:** [http://localhost:5173](http://localhost:5173)

---

## Usuarios de Prueba

Puedes usar las siguientes credenciales para probar las diferentes funcionalidades:

| Rol | Email | Contraseña |
| :--- | :--- | :--- |
| **Admin** | `admin@amifincas.es` | `admin123` |
| **Inmobiliaria** | `inmobiliaria1@amifincas.es` | `realtor123` |
| **Inversor** | `inversor1@amifincas.es` | `investor123` |

## Solución de Problemas

- **Error con pnpm:** Si `npm run dev` falla buscando `pnpm`, utiliza `npx vite` directamente en la carpeta `ubica-portal`.
- **Puerto Ocupado:** Asegúrate de que los puertos 8000 (backend) y 5173 (frontend) estén libres antes de iniciar.
