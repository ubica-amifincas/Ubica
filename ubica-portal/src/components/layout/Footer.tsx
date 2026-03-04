import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

// Instagram Icon
const InstagramIcon = () => (
  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
  </svg>
);

export default function Footer() {
  const { t } = useLanguage();

  const footerLinks = {
    company: [
      { name: t('footer.about'), href: '/about' },
      { name: t('footer.ami'), href: 'https://amifincas.es', external: true },
      { name: t('footer.contact'), href: '/contact' },
    ],
    services: [
      { name: t('footer.buy'), href: '/?status=for-sale' },
      { name: t('footer.sell'), href: 'https://ubica.amifincas.es/register', external: true },
      { name: t('footer.rent'), href: '/?status=for-rent' },
    ],
    support: [
      { name: t('footer.help'), href: '/contact' },
      { name: t('footer.terms'), href: '/terms' },
      { name: t('footer.privacy'), href: '/privacy' },
      { name: t('footer.cookies'), href: '/politica-cookies' },
    ],
  };

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12">
          {/* Column 1: Ubica Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-3 sm:space-y-4">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
              Ubica
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('footer.brand_desc')}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t('footer.slogan').split(t('footer.precision'))[0]}
              <span className="font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                {t('footer.precision')}
              </span>
              {t('footer.slogan').split(t('footer.precision'))[1]}
            </p>
          </div>

          {/* Column 2: Empresa */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t('footer.company')}
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.company.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Servicios */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t('footer.services')}
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.services.map((item) => (
                <li key={item.name}>
                  {(item as any).external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Soporte */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t('footer.support')}
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              {footerLinks.support.map((item) => (
                <li key={item.name}>
                  {(item as any).external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      className="text-sm text-gray-600 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors duration-200"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 sm:mb-6">
            {t('footer.contact_title')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* Murcia Office */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('footer.murcia_office')}</h4>
              <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>C. Ángeles, 41, 30007 Murcia</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex flex-wrap gap-x-3">
                  <a href="tel:+34676626933" className="hover:text-emerald-600 transition-colors">+34 676 62 69 33</a>
                  <a href="tel:+34609008864" className="hover:text-emerald-600 transition-colors">+34 609 00 88 64</a>
                </div>
              </div>
            </div>

            {/* San Pedro Office */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('footer.sanpedro_office')}</h4>
              <div className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <span>C. Panamá, 2A, 30740 San Pedro del Pinatar</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex flex-wrap gap-x-3">
                  <a href="tel:+34968179180" className="hover:text-emerald-600 transition-colors">+34 968 17 91 80</a>
                  <a href="tel:+34609008864" className="hover:text-emerald-600 transition-colors">+34 609 00 88 64</a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <a href="mailto:info@amifincas.es" className="hover:text-emerald-600 transition-colors">info@amifincas.es</a>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('footer.rights')}
            </p>
            <motion.a
              href="https://www.instagram.com/amifincas"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 sm:mt-0 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <span className="sr-only">Instagram</span>
              <InstagramIcon />
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  );
}
