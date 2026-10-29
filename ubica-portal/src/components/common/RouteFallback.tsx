/** Indicador de carga mientras se descarga el código de una página (React.lazy). */
export default function RouteFallback({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[50vh]'} flex items-center justify-center`}
    >
      <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
