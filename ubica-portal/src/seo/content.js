/**
 * Contenido en texto de las páginas públicas para quien no ejecuta JavaScript: buscadores de IA (ChatGPT,
 * Claude, Perplexity...) y lectores. El middleware lo pone en el HTML y en /llms.txt.
 * Son los mismos datos que muestra la web (textos de i18n y datos de las sedes); si cambian allí, cambiarlos aquí.
 * JavaScript sin imports, como pages.js.
 */

export const AMI = {
  name: 'AMI Fincas',
  company: 'MAYNSASER 2014, S.L.',
  since: 2014,
  summary: 'Administración de fincas, gestión de alquileres y correduría de seguros en la Región de Murcia y la provincia de Alicante, desde 2014. Comunidades de propietarios, alquileres y seguros, gestionados con cercanía, cuentas claras y tecnología.',
  phone: '676 62 69 33',
  whatsapp: '676 62 69 33',
  email: 'info@amifincas.es',
  zones: 'Toda la Región de Murcia y la provincia de Alicante',
  instagram: 'https://www.instagram.com/amifincas',
  services: [
    ['Administración de comunidades', 'Gestión profesional de comunidades de propietarios: convocatoria y actas de juntas, contabilidad y cobro de recibos, incidencias y mantenimiento, proveedores y cumplimiento de la normativa.'],
    ['Gestión integral de alquileres', 'Administración completa de viviendas en alquiler: búsqueda y selección de inquilinos, cobros, incidencias y mantenimiento.'],
    ['Mantenimiento y reparaciones', 'Mantenimiento preventivo y correctivo con una red de proveedores de confianza.'],
    ['Contabilidad y reclamaciones', 'Control financiero, informes periódicos y gestión de cobros y pagos.'],
    ['Correduría de seguros propia', 'Seguros para comunidades, viviendas y alquileres.'],
  ],
  offices: [
    { name: 'AMI Fincas Murcia', address: 'Calle Ángeles, 41, 30007 Murcia', phone: '676 62 69 33', hours: 'Lunes a viernes, 9:30 - 14:00', map: 'https://maps.google.com/?cid=4566582778045489499' },
    { name: 'AMI Fincas San Pedro del Pinatar', address: 'Calle Panamá, 2A, 30740 San Pedro del Pinatar (Murcia)', phone: '968 17 91 80', hours: 'Lunes a viernes, 9:30 - 14:00', map: 'https://maps.google.com/?cid=16413795408017082990' },
  ],
  switchSteps: [
    'Pide presupuesto: gratis y sin compromiso, en 24-48 horas laborables.',
    'Los propietarios aprueban el cambio en junta (si hace falta, ayudamos a convocarla).',
    'AMI Fincas recoge la documentación, las cuentas y los contratos del administrador anterior y empieza a trabajar.',
  ],
  faqs: [
    ['¿Cuánto cuesta la administración de mi comunidad?', 'Depende del número de viviendas y de los servicios que necesitéis. Te preparamos un presupuesto a medida, gratis y sin compromiso, en 24-48 horas laborables.'],
    ['¿Cómo se cambia de administrador?', 'El cambio se aprueba en junta de propietarios. Después, nosotros nos encargamos de recoger la documentación, las cuentas y los contratos del administrador anterior.'],
    ['¿En qué zonas trabajáis?', 'En toda la Región de Murcia y la provincia de Alicante, con sedes en Murcia y en San Pedro del Pinatar.'],
    ['¿Qué incluye la administración?', 'Convocatoria y actas de juntas, contabilidad y cobro de recibos, gestión de incidencias y mantenimiento, relación con proveedores y cumplimiento de la normativa. Lo adaptamos a cada comunidad.'],
    ['¿También gestionáis seguros?', 'Sí. Tenemos correduría de seguros propia para comunidades, viviendas y alquileres.'],
    ['¿Gestionáis viviendas en alquiler?', 'Sí: buscamos y seleccionamos inquilinos y nos ocupamos de los cobros, las incidencias y el mantenimiento.'],
  ],
};

export const UBICA = {
  name: 'Ubica',
  summary: 'Ubica es el portal inmobiliario de AMI Fincas: pisos, casas, locales y terrenos en venta y alquiler en toda España, especialmente en la Región de Murcia. Incluye búsqueda en mapa con dibujo de zonas, un asistente de inteligencia artificial que responde sobre los inmuebles publicados y calcula hipotecas y rentabilidades, y un tasador exprés.',
  sections: [
    ['/', 'Inmuebles en venta y alquiler', 'Búsqueda por zona, tipo, precio y habitaciones, en lista o en mapa.'],
    ['/entretenimiento/tasador', 'Tasador exprés', 'Precio orientativo de una vivienda en segundos.'],
    ['/about', 'Sobre nosotros', 'Quiénes somos y cómo ayudamos a comprar, vender o alquilar.'],
    ['/contact', 'Contacto', 'Teléfono, WhatsApp, correo y oficinas.'],
  ],
  about: [
    'Ubica es la plataforma inmobiliaria de AMI Fincas, administradores de fincas en Murcia desde 2014.',
    'Creemos que encontrar la propiedad adecuada debería ser sencillo y transparente: ofrecemos a compradores, vendedores, inversores y propietarios herramientas para decidir con confianza, con análisis de datos e inteligencia artificial.',
    'Atendemos de forma personalizada desde nuestras oficinas de Murcia y San Pedro del Pinatar.',
  ],
};

/** Resumen de una línea de cada página legal (el texto completo está en la web). */
export const LEGAL_SUMMARIES = {
  '/aviso-legal': 'Titular de la web, condiciones de uso y propiedad intelectual.',
  '/privacy': 'Cómo se tratan los datos personales y cómo ejercer tus derechos.',
  '/politica-cookies': 'Qué cookies se usan y cómo configurarlas.',
  '/terms': 'Condiciones de uso del portal inmobiliario Ubica.',
};
