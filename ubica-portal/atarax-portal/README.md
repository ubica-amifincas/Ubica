# 🏠 Ubica Enterprise Frontend

Plataforma inmobiliaria enterprise completa con React, TypeScript y autenticación JWT integrada.

## 🚀 Demo en Vivo

**URL**: https://uenst8y0il.space.minimax.io

## 🔐 Credenciales de Prueba

```bash
# Administrador
Email: admin@ubica.com
Password: admin123

# Inmobiliaria  
Email: inmobiliaria1@ubica.com
Password: realtor123

# Inversionista
Email: inversor1@ubica.com
Password: investor123
```

## ✨ Características

- **React 18** + TypeScript + Vite
- **TailwindCSS** + Framer Motion
- **Autenticación JWT real** integrada con backend
- **Sistema de roles RBAC** (Admin, Realtor, Investor, User)
- **4 portales especializados** completamente funcionales
- **Google Maps** integrado
- **Responsive design** mobile-first
- **Modo oscuro/claro** automático
- **Internacionalización** preparada

## 🎯 Portales Disponibles

### 🏠 Portal Público (`/`)
- Listado de propiedades de Murcia
- Detalles completos con mapas
- Búsqueda y filtros

### 👨‍💼 Portal Admin (`/admin`)
- Dashboard completo de la plataforma
- Gestión de usuarios y roles
- Supervisión de propiedades
- Analytics avanzados

### 🏢 Portal Inmobiliaria (`/realtor`)
- Dashboard de ventas y alquileres
- Gestión de propiedades propias
- Tracking de comisiones
- Analytics de performance

### 💰 Portal Inversionista (`/investor`)
- Dashboard de ROI y portfolio
- Análisis de inversiones
- Oportunidades curadas
- Reportes financieros

## 🛠️ Instalación

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Construir para producción
pnpm build
```

## 🔧 Configuración

Crear archivo `.env.local`:

```env
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
VITE_API_BASE_URL=http://localhost:8000/api
```

## 📱 Estructura del Proyecto

```
src/
├── components/
│   ├── auth/           # Autenticación y rutas protegidas
│   ├── layout/         # Layouts y navegación
│   ├── common/         # Componentes reutilizables
│   └── ui/             # Componentes UI base (Radix)
├── pages/
│   ├── Admin/          # Páginas de administración
│   ├── Realtor/        # Páginas de inmobiliaria
│   ├── Investor/       # Páginas de inversionista
│   └── Dashboard/      # Dashboard general
├── contexts/
│   └── AuthContext.tsx # Gestión de autenticación
├── services/
│   └── apiService.ts   # Cliente API
└── hooks/              # Custom hooks
```

## 🌐 Integración Backend

El frontend está integrado con backend FastAPI que proporciona:

- **Autenticación JWT** real
- **APIs REST** especializadas por rol
- **Base de datos** con propiedades de Murcia
- **Sistema RBAC** completo

**Backend URL**: http://localhost:8000

## 🎨 Diseño

- **Paleta**: Azul (#3B82F6) a Púrpura (#8B5CF6)
- **Tipografía**: Inter system font
- **Iconos**: Heroicons outline
- **Animaciones**: Framer Motion

## 📊 Estado del Proyecto

✅ **COMPLETADO y FUNCIONAL**

- ✅ Autenticación real integrada
- ✅ 4 portales especializados funcionando
- ✅ Datos reales de propiedades cargados
- ✅ Sistema de roles implementado
- ✅ UI/UX profesional y responsive
- ✅ Deploy en producción

---

**Ubica** - Plataforma inmobiliaria de próxima generación 🏠✨
