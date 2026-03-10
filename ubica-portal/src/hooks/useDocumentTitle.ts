import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * useDocumentTitle - Sets the document title based on the current route.
 * Updates the browser tab title dynamically.
 */
const ROUTE_TITLES: Record<string, string> = {
    '/': 'Ubica - Portal Inmobiliario',
    '/login': 'Iniciar Sesión | Ubica',
    '/register': 'Registrarse | Ubica',
    '/dashboard': 'Dashboard | Ubica',
    '/dashboard/properties': 'Gestión de Propiedades | Ubica',
    '/dashboard/sales': 'Estadísticas de Ventas | Ubica',
    '/dashboard/rentals': 'Estadísticas de Alquileres | Ubica',
    '/dashboard/investments': 'Inversiones | Ubica',
    '/dashboard/wealth': 'Patrimonio | Ubica',
    '/dashboard/settings/profile': 'Mi Perfil | Ubica',
    '/dashboard/settings/email': 'Cambiar Email | Ubica',
    '/dashboard/settings/password': 'Cambiar Contraseña | Ubica',
    '/dashboard/settings/mfa': 'Configurar MFA | Ubica',
    '/investor': 'Panel de Inversionista | Ubica',
    '/admin': 'Panel Admin | Ubica',
    '/privacy': 'Privacidad | Ubica',
    '/terms': 'Términos | Ubica',
    '/cookies': 'Cookies | Ubica',
    '/about': 'Sobre Nosotros | Ubica',
    '/contact': 'Contacto | Ubica',
    '/ami-fincas': 'Ami Fincas - Administración de fincas',
    '/amifincas': 'Ami Fincas - Administración de fincas',
};

export default function useDocumentTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const title = ROUTE_TITLES[pathname] || 'Ubica - Portal Inmobiliario';
        document.title = title;
    }, [pathname]);
}
