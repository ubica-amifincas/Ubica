/**
 * Murcia al fondo: la sierra y Monteagudo con su Cristo, los tejados de la ciudad con la torre de la catedral,
 * y delante el Segura con el Puente Viejo, palmeras, naranjos de la huerta y una noria que gira despacio.
 * Es decoración, como el paseo de palmeras de San Pedro: siluetas planas en posiciones fijas que siguen el
 * modo oscuro. La catedral va en el centro para que se vea también en el móvil, donde se recortan los lados;
 * en pantallas anchas conviene una altura de ~10vw para que no se corte la torre por arriba.
 */

const WIDTH = 2000;
const HEIGHT = 200;
const GROUND = 172; // orilla del Segura

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

const free = (x: number, ranges: [number, number][]) => !ranges.some(([a, b]) => x > a && x < b);

// Tejados: bloques de alturas variadas; junto a la catedral, bajos para que se lea la torre
const ROOFS = (() => {
  const rand = seeded(5);
  let d = '';
  const domes: { x: number; y: number; r: number }[] = [];
  for (let x = 0; x < WIDTH;) {
    const w = 26 + rand() * 40;
    const low = x > 880 && x < 1210;
    const h = low ? 8 + rand() * 10 : 14 + rand() * 32;
    d += `M${x.toFixed(0)} ${GROUND}V${(GROUND - h).toFixed(0)}H${(x + w).toFixed(0)}V${GROUND}Z`;
    if (!low && rand() < 0.1) domes.push({ x: x + w / 2, y: GROUND - h, r: Math.min(12, w / 3) });
    x += w - 3;
  }
  return { d, domes };
})();

// Catedral de Santa María: la torre por cuerpos (con los conjuratorios en las esquinas), la fachada barroca,
// la nave con su cúpula y, a la izquierda, la capilla de los Vélez. Los huecos son agujeros (evenodd).
const CATHEDRAL = [
  // Torre
  'M970 172V120H1030V172Z', 'M992 160V146A8 8 0 0 1 1008 146V160Z',
  'M973 120V86H1027V120Z', 'M995 112V101A5 5 0 0 1 1005 101V112Z',
  'M978 86V64H1022V86Z',
  'M969 86V72H980V86Z', 'M969 72A5.5 5.5 0 0 1 980 72Z', 'M1020 86V72H1031V86Z', 'M1020 72A5.5 5.5 0 0 1 1031 72Z',
  'M983 64V44H1017V64Z', 'M987 61V52A4 4 0 0 1 995 52V61Z', 'M1005 61V52A4 4 0 0 1 1013 52V61Z',
  'M984 44A16 14 0 0 1 1016 44Z', 'M996 31V24H1004V31Z', 'M995 24A5 5 0 0 1 1005 24Z', 'M999.3 19V9H1000.7V19Z',
  // Fachada barroca
  'M1034 172V124Q1040 113 1050 111V97Q1058 85 1072 81Q1086 85 1094 97V111Q1104 113 1110 124V172Z',
  'M1062 172V151A10 10 0 0 1 1082 151V172Z', 'M1066 124V110A6 6 0 0 1 1078 110V124Z', 'M1071 81V70H1073V81Z',
  'M1067 74H1077V75.5H1067Z',
  // Nave y cúpula
  'M1110 172V128H1186V172Z', 'M1132 128V112H1168V128Z', 'M1130 112A20 18 0 0 1 1170 112Z',
  'M1147 95V87H1153V95Z', 'M1146 87A4 4 0 0 1 1154 87Z',
  // Capilla de los Vélez
  'M928 172V136L934 128H962L968 136V172Z',
  ...[935, 943, 951, 959].map(x => `M${x} 128V123H${x + 4}V128Z`),
].join('');

// Monteagudo: el cerro, el castillo y el Cristo con los brazos abiertos
const MONTEAGUDO = 'M1225 160L1270 118L1292 82L1306 72L1322 80L1340 116L1390 160Z'
  + 'M1294 82V70H1318V82Z' + [1294, 1301, 1308, 1315].map(x => `M${x} 70V66H${x + 3}V70Z`).join('')
  + 'M1304.5 66V47H1307.5V66Z' + 'M1298 52H1314V54.5H1298Z' + 'M1306 41A3 3 0 1 1 1306 47A3 3 0 1 1 1306 41Z';

// La sierra de Carrascoy detrás de todo
const SIERRA = 'M0 132C160 112 300 126 450 116S760 98 900 112S1180 104 1300 116S1620 100 1780 114S1940 120 2000 116V200H0Z';

// Puente Viejo (de los Peligros) con dos arcos y la capilla de la Virgen al pie
const BRIDGE = 'M610 200V150H900V200Z' + 'M650 200V188A42 24 0 0 1 734 188V200Z' + 'M766 200V188A42 24 0 0 1 850 188V200Z'
  + [620, 650, 680, 710, 740, 770, 800, 830, 860, 890].map(x => `M${x} 150V145H${x + 4}V150Z`).join('')
  + 'M588 172V136L604 126L620 136V172Z' + 'M603 126V118H605V126Z' + 'M600 121H608V122.5H600Z';

const NORIA = { x: 1440, y: 170, r: 26 };

interface Palm { x: number; scale: number; flip: boolean }
interface Tree { x: number; r: number }

// Palmeras en la orilla, lejos del puente, la catedral y la noria
const PALMS: Palm[] = (() => {
  const rand = seeded(11);
  const out: Palm[] = [];
  for (let x = 10; x < WIDTH; x += 30 + rand() * 45) {
    if (free(x, [[575, 915], [915, 1200], [1405, 1530]])) out.push({ x, scale: 0.42 + rand() * 0.28, flip: rand() < 0.5 });
  }
  return out;
})();

// Naranjos de la huerta en los extremos
const TREES: Tree[] = (() => {
  const rand = seeded(17);
  const out: Tree[] = [];
  for (let x = 6; x < WIDTH; x += 16 + rand() * 18) {
    if (x < 560 || x > 1530) out.push({ x, r: 6 + rand() * 4 });
  }
  return out;
})();

const palmTransform = ({ x, scale, flip }: Palm) =>
  `translate(${(x + (flip ? 50 : -50) * scale).toFixed(1)} ${(GROUND - 100 * scale).toFixed(1)}) scale(${flip ? -scale : scale} ${scale})`;

export default function MurciaSkyline({ className = '' }: { className?: string }) {
  const { x: nx, y: ny, r: nr } = NORIA;
  return (
    <div aria-hidden="true" className={`pointer-events-none select-none overflow-hidden
      [--mur-far:#d4e8dd] [--mur-mount:#bfdccf] [--mur-city:#e6d3b8] [--mur-stone:#c9a77e] [--mur-bridge:#b8936c]
      [--mur-water:#9fd6cb] [--mur-shine:#e4f5f1] [--mur-leaf:#3f8f5a] [--mur-grove:#5d9e52] [--mur-trunk:#7a5a3c] [--mur-fruit:#f5a623]
      dark:[--mur-far:#14262f] dark:[--mur-mount:#183039] dark:[--mur-city:#1d2a38] dark:[--mur-stone:#2a3a4a]
      dark:[--mur-bridge:#34404c] dark:[--mur-water:#1f4f4a] dark:[--mur-shine:#2f6d66] dark:[--mur-leaf:#2D8A9D] dark:[--mur-grove:#285a4a]
      dark:[--mur-trunk:#4b4540] dark:[--mur-fruit:#c27a2c] ${className}`}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMax slice" className="block h-full w-full">
        <style>{`
          @keyframes mur-sway { 0%, 100% { transform: skewX(-1.2deg); } 50% { transform: skewX(1.2deg); } }
          @keyframes mur-spin { to { transform: rotate(360deg); } }
          @keyframes mur-shine { 0%, 100% { opacity: .25; } 50% { opacity: .8; } }
          .mur-palms { transform-box: fill-box; transform-origin: 50% 100%; animation: mur-sway 5.5s ease-in-out infinite; }
          .mur-wheel { transform-box: fill-box; transform-origin: 50% 50%; animation: mur-spin 40s linear infinite; }
          .mur-shine { animation: mur-shine 4s ease-in-out infinite; }
          .mur-shine:nth-child(even) { animation-delay: -2s; }
          @media (prefers-reduced-motion: reduce) { .mur-palms, .mur-wheel, .mur-shine { animation: none; } }
        `}</style>
        <defs>
          <symbol id="murcia-palm" viewBox="0 0 100 100" overflow="visible">
            <path d="M50 100 C49 76 52 52 56 31" fill="none" stroke="var(--mur-trunk)" strokeWidth="4" strokeLinecap="round" />
            <g fill="var(--mur-leaf)">
              <path d="M56 30 Q76 17 94 32 Q75 25 56 33 Z" />
              <path d="M56 30 Q36 15 16 29 Q37 24 56 33 Z" />
              <path d="M56 30 Q67 7 86 5 Q69 14 56 32 Z" />
              <path d="M56 30 Q43 5 25 7 Q42 14 56 32 Z" />
              <path d="M56 31 Q74 33 83 53 Q69 38 56 33 Z" />
              <path d="M56 31 Q38 35 28 55 Q42 38 56 33 Z" />
            </g>
          </symbol>
        </defs>

        {/* Fondo: sierra y Monteagudo */}
        <path d={SIERRA} fill="var(--mur-far)" />
        <path d={MONTEAGUDO} fill="var(--mur-mount)" fillRule="evenodd" />

        {/* Ciudad y catedral */}
        <path d={ROOFS.d} fill="var(--mur-city)" />
        {ROOFS.domes.map((d, i) => <path key={i} d={`M${d.x - d.r} ${d.y}A${d.r} ${d.r} 0 0 1 ${d.x + d.r} ${d.y}Z`} fill="var(--mur-city)" />)}
        <path d={CATHEDRAL} fill="var(--mur-stone)" fillRule="evenodd" />

        {/* El Segura */}
        <rect x="0" y={GROUND} width={WIDTH} height={HEIGHT - GROUND} fill="var(--mur-water)" />
        <g fill="var(--mur-shine)">
          {[120, 380, 520, 690, 800, 960, 1120, 1300, 1600, 1760, 1900].map((x, i) => (
            <rect key={x} className="mur-shine" x={x} y={GROUND + 8 + (i % 3) * 6} width={26 + (i % 4) * 8} height="1.6" rx="0.8" />
          ))}
        </g>
        <path d={BRIDGE} fill="var(--mur-bridge)" fillRule="evenodd" />

        {/* Huerta: naranjos y la noria */}
        <g>
          {TREES.map(t => (
            <g key={t.x}>
              <rect x={t.x - 1} y={GROUND - 7} width="2" height="7" fill="var(--mur-trunk)" />
              <circle cx={t.x} cy={GROUND - 7 - t.r * 0.8} r={t.r} fill="var(--mur-grove)" />
              <circle cx={t.x - t.r * 0.35} cy={GROUND - 7 - t.r} r="1.3" fill="var(--mur-fruit)" />
              <circle cx={t.x + t.r * 0.4} cy={GROUND - 7 - t.r * 0.55} r="1.3" fill="var(--mur-fruit)" />
            </g>
          ))}
        </g>
        <path d={`M${nx + 18} 200V${ny - 12}H${nx + 90}V200ZM${nx + 40} 200V${ny + 6}A16 14 0 0 1 ${nx + 72} ${ny + 6}V200Z`}
          fill="var(--mur-bridge)" fillRule="evenodd" />
        <g className="mur-wheel" stroke="var(--mur-trunk)" fill="none">
          <circle cx={nx} cy={ny} r={nr} strokeWidth="3" />
          <circle cx={nx} cy={ny} r={nr * 0.25} strokeWidth="2" />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <line key={i} x1={nx} y1={ny} x2={(nx + Math.cos(a) * nr).toFixed(1)} y2={(ny + Math.sin(a) * nr).toFixed(1)} strokeWidth="1.4" />;
          })}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6 + Math.PI / 12;
            return <rect key={i} x={(nx + Math.cos(a) * nr - 2.5).toFixed(1)} y={(ny + Math.sin(a) * nr - 2.5).toFixed(1)} width="5" height="5" fill="var(--mur-trunk)" stroke="none" />;
          })}
        </g>

        {/* Palmeras de la orilla */}
        <g className="mur-palms">
          {PALMS.map(p => <use key={p.x} href="#murcia-palm" width="100" height="100" transform={palmTransform(p)} />)}
        </g>
      </svg>
    </div>
  );
}
