import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function Terms() {
    const navigate = useNavigate();

    const sections = [
        {
            title: '1. Objeto y Aceptación',
            content: 'Los presentes Términos de Servicio regulan el acceso y uso de la plataforma Ubica (en adelante, "la Plataforma"), desarrollada y operada por AMI Fincas. Al acceder y utilizar la Plataforma, el usuario acepta íntegramente estas condiciones. Si no está de acuerdo con alguna de ellas, deberá abstenerse de utilizar la Plataforma.',
        },
        {
            title: '2. Descripción del Servicio',
            content: 'Ubica es una plataforma de análisis inmobiliario que proporciona herramientas para la búsqueda, comparación, análisis y gestión de propiedades en la Región de Murcia. Los servicios incluyen búsqueda de inmuebles, análisis de mercado, herramientas de inversión, gestión de propiedades y atención personalizada.',
        },
        {
            title: '3. Registro y Cuentas de Usuario',
            content: 'Para acceder a determinadas funcionalidades de la Plataforma, el usuario deberá crear una cuenta proporcionando información veraz y actualizada. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las actividades que se realicen bajo su cuenta.',
        },
        {
            title: '4. Uso Aceptable',
            content: 'El usuario se compromete a utilizar la Plataforma de conformidad con la legislación vigente, estos Términos y la buena fe. Queda prohibido cualquier uso que sea ilegal, fraudulento, que infrinja derechos de terceros o que pueda dañar la imagen de AMI Fincas o de la Plataforma.',
        },
        {
            title: '5. Propiedad Intelectual',
            content: 'Todos los contenidos de la Plataforma, incluyendo textos, imágenes, diseños, logotipos, código fuente, bases de datos y software, son propiedad de AMI Fincas o de sus licenciantes y están protegidos por las leyes de propiedad intelectual e industrial.',
        },
        {
            title: '6. Protección de Datos',
            content: 'El tratamiento de datos personales se realiza conforme a lo establecido en el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos (LOPDGDD). Para más información, consulte nuestra Política de Privacidad.',
        },
        {
            title: '7. Responsabilidad',
            content: 'AMI Fincas no garantiza la disponibilidad continua e ininterrumpida de la Plataforma. Los datos inmobiliarios son orientativos y no constituyen una oferta vinculante. AMI Fincas no se responsabiliza de las decisiones de inversión tomadas basándose en la información de la Plataforma.',
        },
        {
            title: '8. Modificaciones',
            content: 'AMI Fincas se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán efectivas desde su publicación en la Plataforma. El uso continuado de la Plataforma tras la publicación de cambios implica la aceptación de los mismos.',
        },
        {
            title: '9. Legislación Aplicable',
            content: 'Estos Términos se rigen por la legislación española. Para la resolución de cualquier controversia derivada del uso de la Plataforma, las partes se someten a la jurisdicción de los Juzgados y Tribunales de Murcia.',
        },
        {
            title: '10. Contacto',
            content: 'Para cualquier consulta sobre estos Términos de Servicio, puede contactar con nosotros en: AMI Fincas — C. Ángeles, 41, 30007 Murcia — info@amifincas.es — +34 609 00 88 64.',
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
                        <DocumentTextIcon className="h-5 w-5 text-white" />
                        <span className="text-white text-sm font-medium">Última actualización: Febrero 2026</span>
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Términos de Servicio</h1>
                    <p className="text-lg text-white/90 max-w-2xl mx-auto">Condiciones de uso de la plataforma Ubica by AMI Fincas</p>
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
                </div>
            </div>
        </div>
    );
}
