import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useDocumentTitle - Pone el título de la pestaña según la ruta actual.
 * Las rutas dinámicas (ficha de inmueble) ponen su propio título al cargar los datos.
 */
const DEFAULT_TITLE = 'Ubica - Portal Inmobiliario';

const ROUTE_TITLES: Record<string, string> = {
    '/': DEFAULT_TITLE,
    '/login': 'Iniciar Sesión | Ubica',
    '/register': 'Registrarse | Ubica',
    '/verify': 'Verificar correo | Ubica',
    '/forgot-password': 'Recuperar contraseña | Ubica',
    '/reset-password': 'Nueva contraseña | Ubica',
    '/confirm-email-change': 'Confirmar cambio de correo | Ubica',
    '/dashboard': 'Mi Área | Ubica',
    '/dashboard/properties': 'Mis Propiedades | Ubica',
    '/dashboard/sales': 'Ventas | Ubica',
    '/dashboard/rentals': 'Alquileres | Ubica',
    '/dashboard/investments': 'Inversiones | Ubica',
    '/dashboard/wealth': 'Patrimonio | Ubica',
    '/dashboard/settings/profile': 'Mi Perfil | Ubica',
    '/dashboard/settings/email': 'Cambiar Email | Ubica',
    '/dashboard/settings/password': 'Cambiar Contraseña | Ubica',
    '/investor': 'Panel de Inversionista | Ubica',
    '/realtor': 'Panel Inmobiliaria | Ubica',
    '/admin': 'Panel Admin | Ubica',
    '/privacy': 'Privacidad | Ubica',
    '/terms': 'Términos | Ubica',
    '/politica-cookies': 'Política de Cookies | Ubica',
    '/about': 'Sobre Nosotros | Ubica',
    '/contact': 'Contacto | Ubica',
    '/entretenimiento': 'Entretenimiento | Ubica',
    '/entretenimiento/tasador': 'Tasador Express | Ubica',
    '/entretenimiento/balance': 'Ubica Balance | Ubica',
    '/ami-fincas': 'Ami Fincas - Administración de fincas',
};

export default function useDocumentTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
        if (path.startsWith('/property/')) {
            document.title = 'Inmueble | Ubica';
            return;
        }
        document.title = ROUTE_TITLES[path] || 'Página no encontrada | Ubica';
    }, [pathname]);
}
