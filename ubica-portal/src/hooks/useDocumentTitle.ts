import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AMI_ORIGIN, UBICA_ORIGIN, isAmiSite } from '../utils/site';

/**
 * useDocumentTitle - Pone el título de la pestaña, la descripción, la URL canónica y el icono
 * según la ruta y la web (AMI Fincas o Ubica). Las rutas dinámicas (ficha de inmueble)
 * ponen su propio título al cargar los datos.
 */
const DEFAULT_TITLE = 'Ubica - Portal inmobiliario';
const UBICA_DESCRIPTION = 'Ubica - Menos búsquedas, más precisión. Portal inmobiliario de AMI Fincas en la Región de Murcia: pisos, casas y locales en venta y alquiler.';
const AMI_TITLE = 'AMI Fincas | Administración de fincas en Murcia';
const AMI_DESCRIPTION = 'AMI Fincas: administración de comunidades, gestión de alquileres y correduría de seguros en Murcia y San Pedro del Pinatar.';
const AMI_ICON = '/ami-fincas/favAMI.png';
const UBICA_ICON = '/logo_ubica.png';

const ROUTE_TITLES: Record<string, string> = {
    '/': DEFAULT_TITLE,
    '/login': 'Iniciar sesión | Ubica',
    '/register': 'Registrarse | Ubica',
    '/verify': 'Verificar correo | Ubica',
    '/forgot-password': 'Recuperar contraseña | Ubica',
    '/reset-password': 'Nueva contraseña | Ubica',
    '/confirm-email-change': 'Confirmar cambio de correo | Ubica',
    '/dashboard': 'Mi panel | Ubica',
    '/dashboard/properties': 'Mis propiedades | Ubica',
    '/dashboard/sales': 'Ventas | Ubica',
    '/dashboard/rentals': 'Alquileres | Ubica',
    '/dashboard/investments': 'Inversiones | Ubica',
    '/dashboard/wealth': 'Patrimonio | Ubica',
    '/dashboard/settings/profile': 'Mi perfil | Ubica',
    '/dashboard/settings/email': 'Cambiar email | Ubica',
    '/dashboard/settings/password': 'Cambiar contraseña | Ubica',
    '/investor': 'Panel de inversor | Ubica',
    '/investor/portfolio': 'Mi portfolio | Panel de inversor | Ubica',
    '/investor/oportunidades': 'Oportunidades | Panel de inversor | Ubica',
    '/investor/patrimonio': 'Patrimonio | Panel de inversor | Ubica',
    '/realtor': 'Panel de inmobiliaria | Ubica',
    '/realtor/propiedades': 'Cartera de inmuebles | Panel de inmobiliaria | Ubica',
    '/realtor/alquileres': 'Alquileres | Panel de inmobiliaria | Ubica',
    '/realtor/ventas': 'Ventas | Panel de inmobiliaria | Ubica',
    '/realtor/estadisticas': 'Estadísticas | Panel de inmobiliaria | Ubica',
    '/admin': 'Panel de administración | Ubica',
    '/admin/usuarios': 'Usuarios | Panel de administración | Ubica',
    '/admin/propiedades': 'Propiedades | Panel de administración | Ubica',
    '/privacy': 'Política de privacidad | Ubica',
    '/terms': 'Términos de servicio | Ubica',
    '/politica-cookies': 'Política de cookies | Ubica',
    '/aviso-legal': 'Aviso legal | Ubica',
    '/about': 'Sobre nosotros | Ubica',
    '/contact': 'Contacto | Ubica',
    '/entretenimiento': 'Juegos | Ubica',
    '/entretenimiento/tasador': 'Tasador exprés | Ubica',
    '/entretenimiento/balance': 'Ubica Balance | Ubica',
};

function setLink(rel: string, href: string) {
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
    }
    el.href = href;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
    const el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (el) el.content = content;
}

export default function useDocumentTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
        const isAmi = isAmiSite;

        let title = isAmi && path === '/' ? AMI_TITLE : ROUTE_TITLES[path] || 'Página no encontrada | Ubica';
        if (path.startsWith('/property/')) title = 'Inmueble | Ubica';
        // En la web de AMI Fincas, las páginas legales llevan su marca
        if (isAmi) title = title.replace(/\| Ubica$/, '| AMI Fincas');
        document.title = title;

        const description = isAmi ? AMI_DESCRIPTION : UBICA_DESCRIPTION;
        const url = `${isAmi ? AMI_ORIGIN : UBICA_ORIGIN}${path}`;
        setMeta('name', 'description', description);
        setMeta('property', 'og:title', title);
        setMeta('property', 'og:description', description);
        setMeta('property', 'og:url', url);
        setMeta('property', 'og:site_name', isAmi ? 'AMI Fincas' : 'Ubica');
        setLink('canonical', url);
        setLink('icon', isAmi ? AMI_ICON : UBICA_ICON);
        setLink('apple-touch-icon', isAmi ? AMI_ICON : UBICA_ICON);
    }, [pathname]);
}
