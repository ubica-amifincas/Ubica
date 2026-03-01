import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
          >
            <ShieldCheckIcon className="h-5 w-5 text-white" />
            <span className="text-white text-sm font-medium">RGPD · Normativa Europea</span>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Política de Cookies</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">Información sobre el uso de cookies en la plataforma Ubica</p>
        </div>
      </motion.div>

      {/* Content */}
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
            {/* Section 1 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">1. ¿Qué son las cookies?</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (ordenador, tableta, teléfono móvil) cuando visita un sitio web. Se utilizan ampliamente para hacer que los sitios web funcionen de manera más eficiente, así como para proporcionar información a los propietarios del sitio.
              </p>
            </motion.div>

            {/* Section 2 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">2. Cookies que utilizamos</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">En AMI Fincas utilizamos los siguientes tipos de cookies:</p>

              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🟢 Cookies necesarias</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Esenciales para navegar por nuestro sitio web y utilizar sus funciones. Sin ellas no podríamos proporcionarle los servicios solicitados.</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🔵 Cookies analíticas</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nos permiten reconocer y contar el número de visitantes, y ver cómo navegan por el sitio para mejorar su funcionamiento.</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🟢 Cookies de marketing</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Registran su visita para hacer que la publicidad sea más relevante para sus intereses.</p>
                </div>
                <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-xl p-4 border border-cyan-100 dark:border-cyan-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">🔵 Cookies funcionales</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Permiten que el sitio recuerde sus elecciones (idioma, región) y proporcione funciones mejoradas.</p>
                </div>
              </div>
            </motion.div>

            {/* Section 3 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">3. Control de cookies</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                Puede controlar y/o eliminar las cookies según lo desee. Puede eliminar todas las cookies que ya están en su dispositivo y configurar la mayoría de los navegadores para evitar que se coloquen.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Chrome</a>
                <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Firefox</a>
                <a href="https://support.microsoft.com/es-es/windows/eliminar-y-administrar-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Edge</a>
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-center px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors font-medium">Safari</a>
              </div>
            </motion.div>

            {/* Section 4 - Cookie tables */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">4. Cookies específicas utilizadas</h2>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">4.1. Cookies propias</h3>
              <div className="overflow-x-auto mb-6">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white rounded-tl-lg">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidad</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Duración</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white rounded-tr-lg">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">ami-cookie-consent</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Almacena sus preferencias de cookies</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">6 meses</td><td className="px-4 py-3"><span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">Necesaria</span></td></tr>
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">ami-cookie-consent-date</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Almacena la fecha de su consentimiento</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">6 meses</td><td className="px-4 py-3"><span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded text-xs font-medium">Necesaria</span></td></tr>
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">ami_functional_enabled</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Indica si las cookies funcionales están habilitadas</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">1 año</td><td className="px-4 py-3"><span className="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded text-xs font-medium">Funcional</span></td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">4.2. Cookies de terceros</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white rounded-tl-lg">Nombre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Proveedor</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Finalidad</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">Duración</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white rounded-tr-lg">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">_ga</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Google Analytics</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Distingue usuarios únicos</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">2 años</td><td className="px-4 py-3"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">Analítica</span></td></tr>
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">_gid</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Google Analytics</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Distingue usuarios en 24h</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">24 horas</td><td className="px-4 py-3"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">Analítica</span></td></tr>
                    <tr><td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">_gat</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Google Analytics</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">Limita porcentaje de solicitudes</td><td className="px-4 py-3 text-gray-600 dark:text-gray-400">1 minuto</td><td className="px-4 py-3"><span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">Analítica</span></td></tr>
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Section 5 */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">5. Actualizaciones de la política</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Podemos actualizar esta política de cookies periódicamente para reflejar cambios en las cookies que usamos o por otros motivos operativos, legales o regulatorios. Visite esta página regularmente para estar al tanto de las últimas informaciones.
              </p>
            </motion.div>

            {/* Section 6 - Contact */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">6. Contacto</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                Si tiene alguna pregunta sobre nuestro uso de cookies, puede contactarnos:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong className="text-gray-900 dark:text-white">Dirección:</strong> C. Ángeles, 41, 30007 Murcia</p>
                <p><strong className="text-gray-900 dark:text-white">Email:</strong> info@amifincas.es</p>
                <p><strong className="text-gray-900 dark:text-white">Teléfono:</strong> +34 609 00 88 64</p>
              </div>
            </motion.div>
          </div>

          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">Última actualización: Febrero 2026</p>
            <Link to="/privacy" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              Ver Política de Privacidad →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}