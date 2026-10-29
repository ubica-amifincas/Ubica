/**
 * Piezas visuales compartidas por los cuatro paneles privados (usuario, inmobiliaria, inversor y admin).
 * Mismo radio (rounded-xl), mismo borde (gray-200 / gray-700) y superficies blancas / gray-800
 * sobre la página gray-50 / gray-900 que pinta DashboardLayout.
 */
import React, { useState } from 'react';
import { HomeIcon } from '@heroicons/react/24/outline';

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;

/** Importe en euros al estilo español: «135.000 €». */
export const formatEur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Math.round(n || 0));

/** Foto de cabecera de una tarjeta de inmueble; si no hay foto o no carga, un hueco neutro con un icono. */
export function PropertyImage({ src, alt }: { src?: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="flex h-44 w-full items-center justify-center bg-gray-100 dark:bg-gray-700" role="img" aria-label={alt}>
        <HomeIcon className="h-10 w-10 text-gray-400" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className="h-44 w-full object-cover" loading="lazy" />;
}

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

/* -------------------------------------------------------------------------- */
/* Botones y enlaces con aspecto de botón                                      */
/* -------------------------------------------------------------------------- */

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

export const buttonClass = {
  primary: `${buttonBase} bg-emerald-600 text-white hover:bg-emerald-700`,
  secondary: `${buttonBase} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700`,
  danger: `${buttonBase} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20`,
  ghost: `${buttonBase} text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white`,
};

/** Botón cuadrado solo con icono (acciones de fila en tablas y tarjetas). */
export const iconButtonClass = {
  neutral:
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
  brand:
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
  danger:
    'inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
};

/* -------------------------------------------------------------------------- */
/* Cabecera de página                                                          */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-end">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Superficies                                                                 */
/* -------------------------------------------------------------------------- */

export const surfaceClass = 'rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800';

/** Superficie lisa, sin cabecera. */
export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx(surfaceClass, className)} {...rest}>
      {children}
    </div>
  );
}

/** Tarjeta con título, acciones opcionales y cuerpo. `flush` quita el relleno del cuerpo (tablas, listas). */
export function Section({
  title,
  description,
  actions,
  children,
  flush = false,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cx(surfaceClass, 'min-w-0', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cx(!flush && 'p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Indicadores                                                                 */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'brand',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: IconType;
  hint?: React.ReactNode;
  /** brand = verde Ubica; neutral = gris; warning = ámbar (solo para avisos). */
  tone?: 'brand' | 'neutral' | 'warning';
}) {
  const toneClass = {
    brand: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  }[tone];

  return (
    <div className={cx(surfaceClass, 'flex min-w-0 items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5')}>
      <dl className="min-w-0">
        <dt className="line-clamp-2 text-xs font-medium text-gray-500 dark:text-gray-400 sm:text-sm">{label}</dt>
        <dd className="mt-1 break-words font-display text-xl font-semibold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-2xl">
          {value}
        </dd>
        {hint && <dd className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</dd>}
      </dl>
      {Icon && (
        <div className={cx('hidden flex-shrink-0 rounded-lg p-2.5 sm:block', toneClass)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

/** Rejilla estándar para filas de StatCard. */
export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  const colClass = {
    2: '',
    3: 'lg:grid-cols-3 lg:[&>*:last-child:nth-child(odd)]:col-span-1',
    4: 'xl:grid-cols-4 xl:[&>*:last-child:nth-child(odd)]:col-span-1',
  }[cols];
  // Dos por fila ya en móvil (una cifra por pantalla obligaba a hacer mucho scroll);
  // si sobra una tarjeta al final, ocupa la fila entera en vez de quedarse coja
  return (
    <div className={cx('grid grid-cols-2 gap-3 sm:gap-4 [&>*:last-child:nth-child(odd)]:col-span-2', colClass)}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Estados vacíos, carga y errores                                             */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  bare = false,
}: {
  icon?: IconType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Sin borde propio, para usar dentro de una Section. */
  bare?: boolean;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        !bare && 'rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800',
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-3 dark:bg-gray-700">
          <Icon className="h-7 w-7 text-gray-500 dark:text-gray-400" aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[16rem] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600/25 border-t-emerald-600" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorAlert({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
    >
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-medium underline-offset-2 hover:underline">
          Reintentar
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Etiquetas de estado                                                         */
/* -------------------------------------------------------------------------- */

export type BadgeTone = 'brand' | 'warning' | 'danger' | 'neutral';

const badgeTone: Record<BadgeTone, string> = {
  brand: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-400/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20',
  danger: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-400/20',
  neutral: 'bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-400/20',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeTone[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Color semántico de un estado de inmueble: verde = publicado, ámbar = reservado/en obras, gris = cerrado. */
export function propertyStatusTone(status?: string | null): BadgeTone {
  switch (status) {
    case 'for-sale':
    case 'for-rent':
    case 'available':
      return 'brand';
    case 'reserved':
    case 'under-renovation':
    case 'pending':
    case 'draft':
    case 'pending-review':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral'; // sold, rented, in-use y desconocidos
  }
}

/* -------------------------------------------------------------------------- */
/* Tablas                                                                      */
/* -------------------------------------------------------------------------- */

/** Tabla con scroll horizontal dentro de su tarjeta: la página nunca se desborda. */
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cx('min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700', className)}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-gray-50 dark:bg-gray-900/40">{children}</thead>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">{children}</tbody>;
}

export function Th({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cx(
        'whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cx('transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50', className)}>{children}</tr>;
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={cx(
        'whitespace-nowrap px-5 py-3.5 text-gray-700 dark:text-gray-300',
        align === 'right' && 'text-right',
        className,
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* Pila vertical estándar de una página del panel                              */
/* -------------------------------------------------------------------------- */

export function PageStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-6">{children}</div>;
}
