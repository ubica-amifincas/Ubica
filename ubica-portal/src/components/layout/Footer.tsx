import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, EnvelopeIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../contexts/AuthContext';
import { useCookieConsent } from '../../contexts/CookieConsentContext';
import { isAmiSite, amiHref, ubicaHref } from '../../utils/site';
// Mismos datos de contacto y sedes que la web y el texto para buscadores (un solo sitio donde cambiarlos)
import { AMI } from '../../seo/content.js';

const InstagramIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
  </svg>
);

const WhatsAppIcon = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.48.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 01-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 01-1.45-5.03c0-5.21 4.24-9.45 9.46-9.45 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 012.77 6.69c0 5.21-4.24 9.45-9.44 9.45zm8.04-17.5A11.3 11.3 0 0012.04.67C5.77.67.67 5.77.67 12.04c0 2 .52 3.96 1.52 5.69L.57 23.33l5.73-1.5a11.33 11.33 0 005.74 1.46h.01c6.26 0 11.36-5.1 11.37-11.37 0-3.04-1.18-5.89-3.34-8.04z" />
  </svg>
);

type Icon = ComponentType<{ className?: string }>;
interface Item {
  label: ReactNode;
  href: string;
  /** internal: ruta de esta web; same: enlace normal (otra web nuestra, tel:, mailto:); blank: pestaña nueva */
  kind: 'internal' | 'same' | 'blank';
  icon?: Icon;
}

const PHONE = AMI.phone;
const tel = (phone: string) => `tel:+34${phone.replace(/\s/g, '')}`;
const WHATSAPP = `https://wa.me/34${AMI.whatsapp.replace(/\s/g, '')}`;
const linkClass = 'inline-flex items-start gap-2 text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors';

function FooterLink({ item }: { item: Item }) {
  const content = (
    <>
      {item.icon && <item.icon className="h-4 w-4 mt-0.5 shrink-0" />}
      <span>{item.label}</span>
    </>
  );
  if (item.kind === 'internal') return <Link to={item.href} className={linkClass}>{content}</Link>;
  return (
    <a href={item.href} className={linkClass} {...(item.kind === 'blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {content}
    </a>
  );
}

function Column({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function LinkList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map(item => <li key={item.href}><FooterLink item={item} /></li>)}
    </ul>
  );
}

export default function Footer() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openSettings } = useCookieConsent();
  const year = new Date().getFullYear();

  const contact: Item[] = [
    { label: PHONE, href: tel(PHONE), kind: 'same', icon: PhoneIcon },
    { label: 'WhatsApp', href: WHATSAPP, kind: 'blank', icon: WhatsAppIcon },
    { label: AMI.email, href: `mailto:${AMI.email}`, kind: 'same', icon: EnvelopeIcon },
  ];
  const instagram: Item = { label: 'Instagram', href: AMI.instagram, kind: 'blank', icon: InstagramIcon };

  const legal = [
    { label: t('footer.legal'), href: '/aviso-legal' },
    { label: t('footer.privacy'), href: '/privacy' },
    { label: t('footer.cookies'), href: '/politica-cookies' },
    ...(isAmiSite ? [] : [{ label: t('footer.terms_short', 'Condiciones de uso'), href: '/terms' }]),
  ];

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-12">
          {isAmiSite ? (
            <>
              <Column title={t('ami.footer.services', 'Servicios')}>
                <LinkList items={[
                  { label: t('ami.footer.admin', 'Administración de comunidades'), href: '/#servicios', kind: 'same' },
                  { label: t('ami.footer.switch', 'Cambiar de administrador'), href: '/#cambiar', kind: 'same' },
                  { label: t('ami.footer.quote', 'Pedir presupuesto'), href: '/#presupuesto', kind: 'same' },
                  { label: t('ami.footer.faq', 'Preguntas frecuentes'), href: '/#preguntas', kind: 'same' },
                ]} />
              </Column>

              <Column title={t('ami.footer.offices', 'Sedes')}>
                <ul className="space-y-4">
                  {AMI.offices.map(o => (
                    <li key={o.name} className="text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-200">{o.name.replace('AMI Fincas ', '')}</p>
                      <a href={o.map} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-1`}>
                        <MapPinIcon className="h-4 w-4 mt-0.5 shrink-0" /><span>{o.address}</span>
                      </a>
                      <a href={tel(o.phone)} className={`${linkClass} mt-1`}>
                        <PhoneIcon className="h-4 w-4 mt-0.5 shrink-0" /><span>{o.phone}</span>
                      </a>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <ClockIcon className="h-4 w-4 mt-0.5 shrink-0" />{t('footer.hours', AMI.offices[0].hours)}
                  </li>
                </ul>
              </Column>

              <Column title={t('footer.contact')}>
                <LinkList items={[...contact.slice(1), instagram]} />
              </Column>

              <Column title={t('ami.footer.ubica', 'Ubica, portal inmobiliario')}>
                <LinkList items={[
                  { label: t('footer.forSale', 'Inmuebles en venta'), href: ubicaHref('/?status=for-sale'), kind: 'same' },
                  { label: t('footer.forRent', 'Inmuebles en alquiler'), href: ubicaHref('/?status=for-rent'), kind: 'same' },
                  { label: t('footer.map', 'Buscar en el mapa'), href: ubicaHref('/?view=map'), kind: 'same' },
                  { label: 'Ubica Play', href: ubicaHref('/entretenimiento'), kind: 'same' },
                ]} />
              </Column>
            </>
          ) : (
            <>
              <Column title={t('footer.search', 'Buscar inmuebles')}>
                <LinkList items={[
                  { label: t('footer.forSale', 'Inmuebles en venta'), href: '/?status=for-sale', kind: 'internal' },
                  { label: t('footer.forRent', 'Inmuebles en alquiler'), href: '/?status=for-rent', kind: 'internal' },
                  { label: t('footer.map', 'Buscar en el mapa'), href: '/?view=map', kind: 'internal' },
                  { label: t('footer.sellWithUs', 'Vender tu inmueble'), href: '/contact', kind: 'internal' },
                ]} />
              </Column>

              <Column title="Ubica">
                <LinkList items={[
                  { label: t('footer.about'), href: '/about', kind: 'internal' },
                  { label: 'Ubica Play', href: '/entretenimiento', kind: 'internal' },
                  { label: t('footer.daily', 'Reto diario del Tasador'), href: '/entretenimiento/tasador', kind: 'internal' },
                  ...(!user ? [{ label: t('footer.signup', 'Crear cuenta gratis'), href: '/register', kind: 'internal' as const }] : []),
                ]} />
              </Column>

              <Column title={t('footer.contact')}>
                <LinkList items={[...contact, { label: t('footer.contactForm', 'Formulario de contacto'), href: '/contact', kind: 'internal' }]} />
              </Column>

              <Column title="AMI Fincas">
                <LinkList items={[
                  { label: t('footer.amiAdmin', 'Administración de fincas'), href: amiHref(), kind: 'same' },
                  { label: t('footer.amiOffices', 'Sedes en Murcia y San Pedro'), href: amiHref('/#contacto'), kind: 'same' },
                  instagram,
                ]} />
              </Column>
            </>
          )}
        </div>

        <div className="mt-10 sm:mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-md space-y-2">
            {isAmiSite ? (
              <>
                <p className="text-xl font-bold text-[#23707f] dark:text-[#8fd0c3]">AMI Fincas</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{t('ami.footer.desc')}</p>
              </>
            ) : (
              <>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-500">Ubica</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('footer.brand_desc')}{' '}
                  {t('footer.slogan').split(t('footer.precision'))[0]}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-500">{t('footer.precision')}</span>
                  {t('footer.slogan').split(t('footer.precision'))[1]}
                </p>
              </>
            )}
          </div>

          <div className="space-y-3 lg:text-right">
            <nav aria-label={t('footer.legalNav', 'Información legal')} className="flex flex-wrap lg:justify-end gap-x-5 gap-y-2">
              {legal.map(l => (
                <Link key={l.href} to={l.href} className="text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
                  {l.label}
                </Link>
              ))}
              <button type="button" onClick={openSettings} className="text-sm text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
                {t('footer.cookie_settings')}
              </button>
            </nav>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              © {year} {isAmiSite ? 'AMI Fincas' : t('footer.ubicaBy', 'Ubica, un servicio de AMI Fincas')} · {AMI.company}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
