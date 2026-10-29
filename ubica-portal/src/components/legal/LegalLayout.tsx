import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { isAmiSite } from '../../utils/site';
import { slugify } from '../../seo/pages';

/**
 * Maqueta común de los textos legales (redactados por AgenciaDatos para MAYNSASER 2014, S.L.), con la
 * imagen de la web en la que se ven: verde Ubica en ubica.amifincas.es y los colores de AMI en amifincas.es.
 * El índice se arma solo con los apartados (H2) del texto.
 */
export default function LegalLayout({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  const articleRef = useRef<HTMLElement>(null);
  const [sections, setSections] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    const headings = Array.from(articleRef.current?.querySelectorAll('h2') ?? []);
    setSections(headings.map((h, i) => {
      h.id ||= `${slugify(h.textContent || '') || 'apartado'}-${i + 1}`;
      return { id: h.id, label: (h.textContent || '').trim() };
    }));
  }, [children]);

  const ami = isAmiSite;
  const accentText = ami ? 'text-[#23707f] dark:text-[#8fd0c3]' : 'text-emerald-700 dark:text-emerald-400';

  const toc = sections.length > 2 && (
    <nav aria-label="Índice" className="text-sm">
      <p className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
        <ListBulletIcon className="h-4 w-4" aria-hidden="true" /> Índice
      </p>
      <ol className="space-y-2 border-l border-gray-200 pl-4 dark:border-gray-700">
        {sections.map(s => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={`block text-gray-600 hover:underline dark:text-gray-400 ${ami ? 'hover:text-[#23707f] dark:hover:text-[#8fd0c3]' : 'hover:text-emerald-700 dark:hover:text-emerald-400'}`}>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div className={`min-h-screen ${ami ? 'bg-slate-50 dark:bg-[#0f172a]' : 'bg-gray-50 dark:bg-gray-900'}`}>
      {/* Cabecera con el estilo de la portada de cada web */}
      {ami ? (
        <header className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#A2D18D]/20 blur-3xl" aria-hidden="true" />
          <div className="page-container relative pb-6 pt-10 sm:pt-14">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#23707f] dark:text-slate-400 dark:hover:text-[#8fd0c3]">
              <ArrowLeftIcon className="h-4 w-4" /> Volver al inicio
            </Link>
            <p className="mt-8 text-sm font-black uppercase tracking-[0.3em] text-[#23707f] dark:text-[#8fd0c3]">AMI Fincas</p>
            <h1 className="mt-2 font-display text-4xl font-black leading-tight sm:text-5xl">
              <span className="bg-gradient-to-r from-[#5fa64a] to-[#2D8A9D] bg-clip-text text-transparent">{title}</span>
            </h1>
            <Owner updated={updated} />
          </div>
        </header>
      ) : (
        <header className="page-container pt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400">
            <ArrowLeftIcon className="h-4 w-4" /> Volver al inicio
          </Link>
          <div className="mt-6 rounded-3xl bg-emerald-600 px-6 py-8 shadow-xl sm:px-10 sm:py-10">
            <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <Owner updated={updated} light />
          </div>
        </header>
      )}

      <div className="page-container py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
          <div className="min-w-0 max-w-3xl">
            {/* Móvil: índice plegable encima del texto */}
            {toc && (
              <details className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:hidden">
                <summary className={`cursor-pointer font-semibold ${accentText}`}>Ver índice</summary>
                <div className="mt-4">{toc}</div>
              </details>
            )}
            <article ref={articleRef}
              className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 text-[15px] leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:p-10 [&_h2]:scroll-mt-24">
              {children}
            </article>
          </div>
          {toc && <aside className="hidden lg:block"><div className="sticky top-24">{toc}</div></aside>}
        </div>
      </div>
    </div>
  );
}

function Owner({ updated, light = false }: { updated?: string; light?: boolean }) {
  const tone = light ? 'text-white/85' : 'text-slate-500 dark:text-slate-400';
  return (
    <p className={`mt-3 text-sm ${tone}`}>
      MAYNSASER 2014, S.L. · Avda. Casillas de Coria, 4 · 30007 Murcia (Murcia) · España
      {updated && <span className="block sm:inline"><span className="hidden sm:inline"> · </span>Última actualización: {updated}</span>}
    </p>
  );
}

export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="pt-4 text-lg font-bold text-gray-900 dark:text-white">{children}</h2>
);

export const H3 = ({ children }: { children: ReactNode }) => (
  <h3 className="pt-2 font-semibold text-gray-900 dark:text-white">{children}</h3>
);

export const List = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc pl-6 space-y-2">{children}</ul>
);

export const ExtLink = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className={`underline break-all ${isAmiSite ? 'text-[#23707f] dark:text-[#8fd0c3]' : 'text-emerald-700 dark:text-emerald-400'}`}>{href}</a>
);

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-gray-900 dark:text-white">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">{r.map((c, j) => <td key={j} className="px-3 py-2">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
