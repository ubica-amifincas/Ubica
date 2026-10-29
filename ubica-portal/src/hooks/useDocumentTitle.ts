import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AMI_ORIGIN, UBICA_ORIGIN, isAmiSite, isProductionHost } from '../utils/site';
import { pageMeta, parsePropertyId } from '../seo/pages';

/**
 * useDocumentTitle - Pone el título de la pestaña, la descripción, la URL canónica y el icono
 * según la ruta y la web (AMI Fincas o Ubica), con los mismos datos que el middleware pone en el HTML
 * (src/seo/pages.ts). La ficha de inmueble pone los suyos al cargar los datos.
 */
const AMI_ICON = '/ami-fincas/favicon-64.png';
const UBICA_ICON = '/icons/favicon-64.png';
const AMI_TOUCH_ICON = '/ami-fincas/icon-192.png';
const UBICA_TOUCH_ICON = '/icons/apple-touch-icon.png';

function setLink(rel: string, href: string) {
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
    }
    el.href = href;
}

export function setMeta(attr: 'name' | 'property', key: string, content: string) {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
    }
    el.content = content;
}

/** Canónica y metadatos para compartir de la página actual (también la usa la ficha de inmueble). */
export function setPageHead(title: string, description: string, url: string) {
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setLink('canonical', url);
}

export default function useDocumentTitle() {
    const { pathname } = useLocation();

    useEffect(() => {
        const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
        const isAmi = isAmiSite;
        setMeta('property', 'og:site_name', isAmi ? 'AMI Fincas' : 'Ubica');
        setLink('icon', isAmi ? AMI_ICON : UBICA_ICON);
        setLink('apple-touch-icon', isAmi ? AMI_TOUCH_ICON : UBICA_TOUCH_ICON);

        // La ficha de inmueble pone su título y su dirección canónica cuando tiene los datos
        if (!isAmi && parsePropertyId(path) !== null) {
            setMeta('name', 'robots', isProductionHost() ? 'index, follow' : 'noindex, follow');
            return;
        }

        const meta = pageMeta(isAmi ? 'ami' : 'ubica', path);
        setPageHead(meta.title, meta.description, `${isAmi ? AMI_ORIGIN : UBICA_ORIGIN}${path}`);
        // Al navegar dentro de la app, una página privada no debe heredar "index" ni al revés
        // (y las vistas previas de Vercel nunca se indexan)
        setMeta('name', 'robots', meta.index && isProductionHost() ? 'index, follow' : 'noindex, follow');
    }, [pathname]);
}
