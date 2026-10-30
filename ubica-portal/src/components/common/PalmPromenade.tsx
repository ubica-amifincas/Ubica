/**
 * Paseo de mil palmeras: tres filas de siluetas (lejos, medio y cerca) que se mecen con la brisa.
 * Es decoración: un solo símbolo SVG reutilizado, posiciones fijas (siempre el mismo paseo) y el vaivén
 * por filas con CSS, que se para si el visitante prefiere menos movimiento.
 */

const WIDTH = 2000;
const HEIGHT = 160;

interface Palm { x: number; scale: number; flip: boolean; ground: number }

function row(count: number, minScale: number, maxScale: number, ground: number, seed: number): Palm[] {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return Array.from({ length: count }, (_, i) => ({
    x: ((i + rand() * 0.9) / count) * WIDTH,
    scale: minScale + rand() * (maxScale - minScale),
    flip: rand() < 0.5,
    ground: ground + rand() * 4,
  }));
}

// Con perspectiva: muchas y pequeñas en el horizonte, pocas y grandes delante. 800 + 160 + 40 = 1000 palmeras
const ROWS = [
  { palms: row(800, 0.12, 0.2, HEIGHT - 34, 3), className: 'palm-row palm-row-far [--palm-leaf:#b7ddd3] [--palm-trunk:#cbb9a2] dark:[--palm-leaf:#16343a] dark:[--palm-trunk:#2a2f38]' },
  { palms: row(160, 0.32, 0.48, HEIGHT - 16, 7), className: 'palm-row palm-row-mid [--palm-leaf:#7cbf8c] [--palm-trunk:#a88a68] dark:[--palm-leaf:#1f4f4a] dark:[--palm-trunk:#3b3a3f]' },
  { palms: row(40, 0.85, 1.25, HEIGHT, 13), className: 'palm-row palm-row-near [--palm-leaf:#3f8f5a] [--palm-trunk:#7a5a3c] dark:[--palm-leaf:#2D8A9D] dark:[--palm-trunk:#4b4540]' },
];

// Base de la palmera en (50, 100) del símbolo; la copa, arriba a la derecha
const transform = ({ x, scale, flip, ground }: Palm) =>
  `translate(${(x + (flip ? 50 : -50) * scale).toFixed(1)} ${(ground - 100 * scale).toFixed(1)}) scale(${flip ? -scale : scale} ${scale})`;

export default function PalmPromenade({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none select-none overflow-hidden ${className}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMax slice" className="block h-full w-full">
        <style>{`
          @keyframes palm-sway { 0%, 100% { transform: skewX(-1.4deg); } 50% { transform: skewX(1.4deg); } }
          .palm-row { transform-box: fill-box; transform-origin: 50% 100%; animation: palm-sway 7s ease-in-out infinite; }
          .palm-row-mid { animation-duration: 5.5s; animation-delay: -1.5s; }
          .palm-row-near { animation-duration: 4.5s; animation-delay: -3s; }
          @media (prefers-reduced-motion: reduce) { .palm-row { animation: none; } }
        `}</style>
        <defs>
          <symbol id="palm" viewBox="0 0 100 100" overflow="visible">
            <path d="M50 100 C49 76 52 52 56 31" fill="none" stroke="var(--palm-trunk)" strokeWidth="4" strokeLinecap="round" />
            <g fill="var(--palm-leaf)">
              <path d="M56 30 Q76 17 94 32 Q75 25 56 33 Z" />
              <path d="M56 30 Q36 15 16 29 Q37 24 56 33 Z" />
              <path d="M56 30 Q67 7 86 5 Q69 14 56 32 Z" />
              <path d="M56 30 Q43 5 25 7 Q42 14 56 32 Z" />
              <path d="M56 31 Q74 33 83 53 Q69 38 56 33 Z" />
              <path d="M56 31 Q38 35 28 55 Q42 38 56 33 Z" />
            </g>
          </symbol>
        </defs>
        {ROWS.map(r => (
          <g key={r.className} className={r.className}>
            {r.palms.map((palm, i) => <use key={i} href="#palm" width="100" height="100" transform={transform(palm)} />)}
          </g>
        ))}
      </svg>
    </div>
  );
}
