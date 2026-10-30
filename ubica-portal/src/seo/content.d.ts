/** Tipos de content.js (contenido en texto de las páginas públicas para buscadores e IA). */
export interface Office { name: string; address: string; phone: string; hours: string; map: string }
export interface CoastPage {
  path: string; heading: string; intro: string; towns: string[]; points: [string, string][]; faqs: [string, string][]; english: string;
}
export const AMI: {
  name: string; company: string; since: number; summary: string; phone: string; whatsapp: string; email: string;
  zones: string; instagram: string; services: [string, string][]; offices: Office[]; switchSteps: string[]; faqs: [string, string][]; coast: CoastPage;
};
export const UBICA: { name: string; summary: string; sections: [string, string, string][]; about: string[] };
export const LEGAL_SUMMARIES: Record<string, string>;
