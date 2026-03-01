import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function Privacy() {
    const navigate = useNavigate();

    const sections = [
        {
            title: '1. Responsable del Tratamiento',
            content: 'El responsable del tratamiento de sus datos personales es AMI Fincas, con domicilio en C. Ángeles, 41, 30007 Murcia, España. Puede contactarnos en info@amifincas.es o en el teléfono +34 609 00 88 64.',
        },
        {
            title: '2. Datos Personales Recogidos',
            content: 'Recogemos los datos que usted nos proporciona voluntariamente al registrarse o contactarnos: nombre, apellidos, email, teléfono, empresa y preferencias inmobiliarias. También recopilamos datos de navegación como dirección IP, tipo de navegador, páginas visitadas y tiempo de navegación.',
        },
        {
            title: '3. Finalidad del Tratamiento',
            content: 'Sus datos son tratados para: gestionar su cuenta de usuario, proporcionar los servicios de la plataforma Ubica, enviar comunicaciones sobre propiedades que puedan interesarle, mejorar nuestros servicios mediante análisis estadísticos, y cumplir con obligaciones legales.',
        },
        {
            title: '4. Base Jurídica',
            content: 'El tratamiento de sus datos se basa en: su consentimiento explícito, la ejecución de un contrato de servicio, nuestro interés legítimo en mejorar nuestros servicios, y el cumplimiento de obligaciones legales aplicables.',
        },
        {
            title: '5. Destinatarios de los Datos',
            content: 'Sus datos no serán cedidos a terceros salvo obligación legal. Podemos compartir datos con proveedores de servicios que actúan como encargados del tratamiento (hosting, email marketing, analítica web) con los que tenemos contratos de protección de datos.',
        },
        {
            title: '6. Derechos del Usuario',
            content: 'Usted tiene derecho a acceder, rectificar, suprimir y portar sus datos, así como a oponerse y limitar su tratamiento. Puede ejercer estos derechos enviando un email a info@amifincas.es con el asunto "Protección de Datos" adjuntando copia de su DNI.',
        },
        {
            title: '7. Conservación de Datos',
            content: 'Sus datos se conservarán mientras sea necesario para la finalidad del tratamiento y, una vez cesada dicha necesidad, durante los plazos legales de prescripción aplicables. Los datos de navegación se conservan durante un máximo de 24 meses.',
        },
        {
            title: '8. Seguridad',
            content: 'Adoptamos medidas técnicas y organizativas apropiadas para proteger sus datos personales contra el acceso no autorizado, la alteración, la divulgación o la destrucción. Estas incluyen cifrado de datos, control de acceso y auditorías de seguridad periódicas.',
        },
        {
            title: '9. Cookies',
            content: 'Utilizamos cookies y tecnologías similares para mejorar su experiencia. Para más información, consulte nuestra Política de Cookies, accesible desde el pie de página de nuestra web.',
        },
        {
            title: '10. Modificaciones',
            content: 'Nos reservamos el derecho de modificar esta Política de Privacidad para adaptarla a novedades legislativas o jurisprudenciales. Cualquier modificación será publicada en esta página con indicación de la fecha de última actualización.',
        },
    ];

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
                        <span className="text-white text-sm font-medium">RGPD · LOPDGDD</span>
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Política de Privacidad</h1>
                    <p className="text-lg text-white/90 max-w-2xl mx-auto">Cómo protegemos y tratamos sus datos personales</p>
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
                        {sections.map((section, i) => (
                            <motion.div
                                key={section.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.05 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700"
                            >
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{section.title}</h2>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{section.content}</p>
                            </motion.div>
                        ))}
                    </div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-center text-sm text-gray-500 dark:text-gray-400 mt-12"
                    >
                        Última actualización: Febrero 2026
                    </motion.p>
                </div>
            </div>
        </div>
    );
}
