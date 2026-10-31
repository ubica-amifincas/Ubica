// Datos de contacto de AMI Fincas (los mismos que la ficha de Google Maps de cada sede); Ubica atiende con ellos
export const MAIN_PHONE = '676 62 69 33';
export const WHATSAPP_NUMBER = '34676626933';
export const EMAIL = 'info@amifincas.es';

export const tel = (phone: string) => `tel:+34${phone.replace(/\s+/g, '')}`;
export const whatsappHref = (text: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
