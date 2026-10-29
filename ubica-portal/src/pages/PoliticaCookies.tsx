import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const cardClass = 'bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700';
const cellClass = 'px-4 py-3 text-gray-600 dark:text-gray-400 align-top';
const keyClass = `${cellClass} font-mono text-xs whitespace-nowrap`;

const LOCAL_STORAGE_ITEMS: { key: string; purpose: string; when: string }[] = [
  { key: 'access_token', purpose: 'Token de tu sesión para identificarte ante el servidor de Ubica.', when: 'Al iniciar sesión. Se borra al cerrar sesión o si caduca.' },
  { key: 'user', purpose: 'Datos básicos de tu cuenta (nombre, email, rol) para mostrar tu área privada.', when: 'Al iniciar sesión. Se borra al cerrar sesión.' },
  { key: 'ubica-theme', purpose: 'Recuerda si prefieres el tema claro u oscuro.', when: 'Al cambiar el tema.' },
  { key: 'ubica-language / i18nextLng', purpose: 'Recuerda el idioma de la interfaz.', when: 'Al cargar la web o cambiar el idioma.' },
  { key: 'ubica-storage-notice', purpose: 'Recuerda que ya has leído este aviso para no volver a mostrarlo.', when: 'Al pulsar «Entendido».' },
  { key: 'pwa-install-dismissed', purpose: 'Recuerda que has descartado la sugerencia de instalar la aplicación.', when: 'Al cerrar esa sugerencia.' },
  { key: 'ubica_wealth_assets / ubica_wealth_liabilities', purpose: 'Activos y pasivos que introduces en la herramienta de patrimonio. Solo se guardan en tu navegador.', when: 'Al usar la sección Patrimonio.' },
  { key: 'ubica_balance_best / ubica_balance_dark_mode', purpose: 'Tu mejor puntuación y el modo visual del juego Ubica Balance.', when: 'Al jugar.' },
];

const THIRD_PARTIES: { provider: string; purpose: string; where: string }[] = [
  { provider: 'Google Fonts (fonts.googleapis.com, fonts.gstatic.com)', purpose: 'Descarga de la tipografía Inter.', where: 'Todas las páginas' },
  { provider: 'unpkg.com', purpose: 'Hoja de estilos e iconos de los marcadores del mapa (Leaflet).', where: 'Páginas con mapa' },
  { provider: 'OpenStreetMap (tile.openstreetmap.org)', purpose: 'Imágenes (teselas) del mapa.', where: 'Inicio, ficha de inmueble, alta de inmuebles' },
  { provider: 'Google Maps (mapa incrustado)', purpose: 'Mapa con la ubicación de la oficina. Google puede establecer sus propias cookies al cargarlo.', where: 'Contacto y AMI Fincas' },
  { provider: 'via.placeholder.com', purpose: 'Imagen genérica cuando un inmueble no tiene foto.', where: 'Listados de inmuebles' },
];

export default function PoliticaCookies() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 py-16"
      >
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <ShieldCheckIcon className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-medium">RGPD · LSSI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Política de Cookies</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">Qué guardamos en tu navegador y por qué</p>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium mb-8 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver
          </button>

          <div className="space-y-6">
            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. Resumen</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Ubica <strong>no utiliza cookies analíticas, publicitarias ni de seguimiento</strong>, ni herramientas como Google Analytics.
                Solo guardamos en tu navegador la información técnica imprescindible para que la web funcione (tu sesión) y las
                preferencias que tú eliges (tema e idioma). Por eso no te pedimos consentimiento: estos elementos están exentos según
                el artículo 22.2 de la LSSI, y solo te informamos de ellos.
              </p>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">2. Almacenamiento local de tu navegador</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                En lugar de cookies, usamos el <em>localStorage</em> del navegador. Estos datos no se envían a terceros y permanecen en
                tu dispositivo hasta que se borran (al cerrar sesión, desde la propia web o desde la configuración del navegador).
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Clave</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidad</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Cuándo se guarda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {LOCAL_STORAGE_ITEMS.map(item => (
                      <tr key={item.key}>
                        <td className={keyClass}>{item.key}</td>
                        <td className={cellClass}>{item.purpose}</td>
                        <td className={cellClass}>{item.when}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Si instalas Ubica como aplicación, el navegador también guarda una copia de los archivos de la web (caché del
                <em> service worker</em>) para que cargue más rápido. No contiene datos personales.
              </p>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Servicios de terceros</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Para mostrar algunos contenidos, tu navegador descarga recursos de estos proveedores. Al hacerlo, el proveedor recibe
                datos técnicos de la conexión (como tu dirección IP), según sus propias políticas de privacidad.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Proveedor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Para qué</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Dónde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {THIRD_PARTIES.map(tp => (
                      <tr key={tp.provider}>
                        <td className={`${cellClass} font-medium`}>{tp.provider}</td>
                        <td className={cellClass}>{tp.purpose}</td>
                        <td className={cellClass}>{tp.where}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">4. Cómo borrar estos datos</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Al cerrar sesión se eliminan el token y los datos de tu cuenta. Puedes borrar todo lo demás desde la configuración de
                tu navegador («Borrar datos de navegación» o «Datos de sitios»):
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Chrome</a>
                <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Firefox</a>
                <a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Edge</a>
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Safari</a>
              </div>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Cambios en esta política</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Si en el futuro incorporamos cookies que requieran tu consentimiento (por ejemplo, de analítica), actualizaremos esta
                página y te lo pediremos antes de activarlas.
              </p>
            </section>

            <section className={cardClass}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Contacto</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Si tienes cualquier pregunta sobre esta política, puedes escribirnos:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong className="text-gray-900 dark:text-white">Dirección:</strong> C. Ángeles, 41, 30007 Murcia</p>
                <p><strong className="text-gray-900 dark:text-white">Email:</strong> info@amifincas.es</p>
                <p>
                  <strong className="text-gray-900 dark:text-white">Formulario:</strong>{' '}
                  <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 hover:underline">página de contacto</Link>
                </p>
              </div>
            </section>
          </div>

          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">Última actualización: Octubre 2026</p>
            <Link to="/privacy" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Ver Política de Privacidad →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
