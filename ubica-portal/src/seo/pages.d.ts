/** Tipos de pages.js (título, descripción e indexación de cada página; direcciones de inmuebles). */
export const UBICA_ORIGIN: string;
export const AMI_ORIGIN: string;
export type SiteKey = 'ubica' | 'ami';
export interface PageMeta {
  title: string;
  description: string;
  /** false: la página existe pero no debe salir en buscadores */
  index: boolean;
  /** false: la dirección no corresponde a ninguna página (404) */
  known: boolean;
}
export const UBICA_TITLE: string;
export const UBICA_DESCRIPTION: string;
export const AMI_TITLE: string;
export const AMI_DESCRIPTION: string;
export const AMI_SITE_PATHS: string[];
export const UBICA_SITEMAP_PATHS: string[];
export function normalizePath(path: string): string;
export function pageMeta(site: SiteKey, rawPath: string): PageMeta;
export function slugify(text: string): string;
export function propertyPath(p: { id: number; title?: string | null }): string;
export function parsePropertyId(path: string): number | null;
