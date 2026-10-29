import LegalLayout, { H2 } from '../components/legal/LegalLayout';

export default function Terms() {
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
            content: 'Para cualquier consulta sobre estos Términos de Servicio, puede contactar con nosotros en: AMI Fincas — C. Ángeles, 41, 30007 Murcia — info@amifincas.es — 676 62 69 33.',
        },
    ];

    return (
        <LegalLayout title="Términos de servicio" updated="febrero de 2026">
            {sections.map(section => (
                <section key={section.title}>
                    <H2>{section.title}</H2>
                    <p className="mt-2">{section.content}</p>
                </section>
            ))}
        </LegalLayout>
    );
}
