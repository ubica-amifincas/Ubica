import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

/** Maqueta común de los textos legales (redactados por AgenciaDatos para MAYNSASER 2014, S.L.). */
export default function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-emerald-700 dark:hover:text-emerald-400">
          <ArrowLeftIcon className="h-4 w-4" /> Volver al inicio
        </Link>
        <header className="mt-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">MAYNSASER 2014, S.L. · Avda. Casillas de Coria, 4 · 30007 Murcia (Murcia) · España</p>
        </header>
        <article className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 sm:p-10 text-gray-700 dark:text-gray-300 leading-relaxed space-y-4 text-[15px]">
          {children}
        </article>
      </div>
    </div>
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
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-700 dark:text-emerald-400 underline break-all">{href}</a>
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
