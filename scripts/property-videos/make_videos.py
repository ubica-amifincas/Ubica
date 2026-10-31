"""Vídeos de los inmuebles a partir de sus fotos reales (sin IA: movimiento de cámara, fundidos y rótulos con ffmpeg).

Para cada anuncio público con fotos genera dos vídeos de unos 30 s:
  horizontal (1280x720)  para la ficha del inmueble
  vertical   (720x1280)  para estados de WhatsApp, Instagram o TikTok
y los sube al bucket público «property-videos» de Supabase junto con index.json, que dice a la web qué vídeo
tiene cada inmueble. Solo se rehace el vídeo de un inmueble cuando cambian sus fotos o sus datos.

Variables de entorno:
  SUPABASE_URL, SUPABASE_SECRET_KEY  sin ellas no se sube nada (prueba en local: los vídeos quedan en OUT_DIR)
  API            API pública de Ubica (por defecto la de producción)
  OUT_DIR        carpeta de trabajo (por defecto ./videos)
  ONLY_ID        generar solo ese inmueble
  FORCE=1        rehacer aunque no haya cambios
  CHECK_ONLY=1   solo decir si hay algo que hacer (pending=true/false en GITHUB_OUTPUT), sin ffmpeg ni Pillow
  MAX_PER_RUN    tope de inmuebles por ejecución (por defecto 10)
  FONT_REGULAR, FONT_BOLD, FFMPEG
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

# Cambiarla hace que se regeneren todos los vídeos (p. ej. al tocar el diseño)
DESIGN_VERSION = 1

API = os.environ.get('API', 'https://ubica-backend.onrender.com/api').rstrip('/')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_SECRET_KEY', '')
BUCKET = 'property-videos'
OUT = Path(os.environ.get('OUT_DIR', 'videos')).resolve()
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
ONLY_ID = os.environ.get('ONLY_ID', '').strip()
FORCE = os.environ.get('FORCE', '') == '1'
CHECK_ONLY = os.environ.get('CHECK_ONLY', '') == '1'
MAX_PER_RUN = int(os.environ.get('MAX_PER_RUN', '10'))
LOGO = Path(__file__).resolve().parents[2] / 'ubica-portal' / 'public' / 'logo_ubica.png'

FPS = 30
PHOTO_S = 3.2      # segundos por foto
CARD_S = 3.6       # portada y cierre
FADE = 0.6         # fundido entre tramos
MAX_PHOTOS = 10

INK = '0x10252d'
TEAL = '0x357186'
DARK_TEAL = '0x2b5d6e'
CREAM = '0xfbf7f1'
MINT = '0xabdbb0'

PHONE = '676 62 69 33'
WEB = 'ubica.amifincas.es'

OPERATION = {'for-sale': 'EN VENTA', 'for-rent': 'EN ALQUILER', 'reserved': 'RESERVADO', 'available': 'DISPONIBLE'}
TYPE_LABELS = {
    'flat': 'Piso', 'apartment': 'Apartamento', 'house': 'Casa', 'townhouse': 'Adosado', 'villa': 'Villa',
    'chalet': 'Chalet', 'penthouse': 'Ático', 'duplex': 'Dúplex', 'studio': 'Estudio', 'land': 'Terreno',
    'commercial': 'Local comercial',
}


# ---------- utilidades ----------

def log(*args):
    print(*args, flush=True)


def fc_match(pattern: str) -> str:
    try:
        return subprocess.run(['fc-match', '-f', '%{file}', pattern], capture_output=True, text=True).stdout.strip()
    except FileNotFoundError:
        return ''


FONT_REGULAR = os.environ.get('FONT_REGULAR') or fc_match('Inter:style=Regular') or fc_match('sans')
FONT_BOLD = os.environ.get('FONT_BOLD') or fc_match('Inter:style=Bold') or fc_match('sans:bold')


def http(method: str, url: str, data: bytes | None = None, headers: dict | None = None, timeout: int = 120):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def get_json(url: str, tries: int = 4):
    # La API está en un plan que se duerme: el primer intento puede tardar o fallar
    for i in range(tries):
        try:
            return json.loads(http('GET', url, timeout=120)[1])
        except (urllib.error.URLError, TimeoutError) as e:
            if i == tries - 1:
                raise
            log(f'  reintento ({e})')
            time.sleep(20)


def ffmpeg(args: list[str], cwd: Path | None = None):
    # Los filtros usan rutas relativas a «cwd» (fuentes y textos): una ruta con «C:» rompería el filtro en Windows
    r = subprocess.run([FFMPEG, '-v', 'error', '-y', *args], capture_output=True, text=True, cwd=cwd)
    if r.returncode:
        raise RuntimeError(r.stderr.strip()[-2000:])


def euros(value) -> str:
    return f'{round(float(value)):,}'.replace(',', '.') + ' €'


# ---------- datos del anuncio ----------

def texts(p: dict) -> dict:
    kind = TYPE_LABELS.get((p.get('type') or '').lower(), (p.get('type') or '').capitalize())
    price = p.get('price')
    price_txt = (euros(price) + ('/mes' if p.get('status') == 'for-rent' else '')) if price else 'Consultar precio'
    facts = []
    if p.get('bedrooms'):
        facts.append(f"{p['bedrooms']} hab.")
    if p.get('bathrooms'):
        facts.append(f"{p['bathrooms']} baño{'s' if p['bathrooms'] != 1 else ''}")
    if p.get('area'):
        facts.append(f"{round(float(p['area']))} m²")
    extras = [f.strip().capitalize() for f in (p.get('features') or []) if isinstance(f, str) and 0 < len(f.strip()) <= 14][:2]
    address, city = (p.get('address') or '').strip(), (p.get('city') or '').strip()
    place = address or city or p.get('title') or ''
    sub = city if address and city and city.lower() not in address.lower() else (p.get('region') or '')
    return {
        'op': ' · '.join(x for x in [OPERATION.get(p.get('status'), ''), kind.upper()] if x),
        'place': place,
        'sub': sub,
        'price': price_txt,
        'facts': '  ·  '.join(facts + extras),
        'facts_short': ' · '.join(facts) or kind,
    }


def fingerprint(p: dict) -> str:
    keys = ['title', 'price', 'status', 'type', 'address', 'city', 'region', 'bedrooms', 'bathrooms', 'area', 'features']
    payload = {k: p.get(k) for k in keys}
    payload['images'] = (p.get('images') or [])[:MAX_PHOTOS]
    payload['design'] = DESIGN_VERSION
    return hashlib.sha1(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# ---------- render ----------

class Render:
    def __init__(self, work: Path, mode: str, t: dict):
        self.work, self.mode, self.t = work, mode, t
        self.W, self.H = (1280, 720) if mode == 'horizontal' else (720, 1280)
        self.n = 0

    def txt(self, text: str) -> str:
        """drawtext lee el texto de un fichero: así no hay que escapar tildes, €, comas ni dos puntos."""
        self.n += 1
        name = f'txt-{self.mode}-{self.n}.txt'
        (self.work / name).write_text(text, encoding='utf-8')
        return name

    def dt(self, text, size, color, x, y, bold=True, start=0.0, alpha=1.0, max_w=None):
        if max_w:  # reduce la letra si el texto es largo (ancho medio de un carácter ≈ 0,55 × tamaño)
            size = max(int(size * 0.55), min(size, int(max_w / (0.55 * max(len(text), 1)))))
        font = 'bold.ttf' if bold else 'regular.ttf'
        a = f"if(lt(t,{start}),0,min(1,(t-{start})/0.5))*{alpha}"
        return (f"drawtext=fontfile={font}:textfile={self.txt(text)}:fontsize={size}:fontcolor={color}"
                f":x={x}:y={y}:alpha='{a}'")

    def encode(self, inputs: list[str], graph: str, seconds: float, out: Path):
        ffmpeg([*inputs, '-filter_complex', graph, '-map', '[v]', '-t', str(seconds), '-r', str(FPS),
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', str(out)], cwd=self.work)

    def info_bar(self) -> list[str]:
        t, W = self.t, self.W
        if self.mode == 'horizontal':
            h = 64
            return [f"drawbox=x=0:y=ih-{h}:w=iw:h={h}:color={INK}@0.82:t=fill",
                    self.dt(t['price'], 30, 'white', 28, f'h-{h}+15', max_w=260),
                    self.dt(t['facts'], 21, MINT, 300, f'h-{h}+22', bold=False, max_w=W - 300 - 240),
                    self.dt(WEB, 20, 'white', 'w-tw-28', f'h-{h}+22', bold=False, alpha=0.85)]
        h = 150
        return [f"drawbox=x=0:y=ih-{h}:w=iw:h={h}:color={INK}@0.82:t=fill",
                self.dt(t['price'], 46, 'white', 36, f'h-{h}+22', max_w=400),
                self.dt(t['facts_short'], 28, MINT, 36, f'h-{h}+86', bold=False, max_w=W - 72),
                self.dt(WEB, 24, 'white', 'w-tw-36', f'h-{h}+36', bold=False, alpha=0.85)]

    def photo(self, i: int, src: Path, size: tuple[int, int]) -> Path:
        W, H = self.W, self.H
        pw, ph = size
        # Primer plano: la foto entera, sin recortar; fondo: la misma foto desenfocada a sangre
        k = min(W / pw, H / ph)
        fw, fh = int(pw * k) // 2 * 2, int(ph * k) // 2 * 2
        n = int(PHOTO_S * FPS)
        z = f"1+0.09*on/{n}" if i % 2 == 0 else f"1.09-0.09*on/{n}"
        x = 'iw/2-(iw/zoom/2)' if i % 3 != 1 else f'iw/2-(iw/zoom/2)+(iw-iw/zoom)/2*(on/{n}-0.5)'
        graph = ';'.join([
            "[0:v]split[a][b]",
            f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:4,eq=brightness=-0.12:saturation=0.8[bg]",
            # Se amplía antes del zoompan para que el movimiento no tiemble
            f"[b]scale={fw * 3}:{fh * 3},zoompan=z='{z}':x='{x}':y='ih/2-(ih/zoom/2)':d=1:s={fw}x{fh}:fps={FPS}[fg]",
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2," + ','.join(self.info_bar()) + ",format=yuv420p[v]",
        ])
        out = self.work / f'{self.mode}-{i:02d}.mp4'
        self.encode(['-loop', '1', '-framerate', str(FPS), '-t', str(PHOTO_S), '-i', str(src)], graph, PHOTO_S, out)
        return out

    def intro(self, src: Path) -> Path:
        W, H, t = self.W, self.H, self.t
        n = int(CARD_S * FPS)
        horizontal = self.mode == 'horizontal'
        big = 64 if horizontal else 72
        x0 = 70 if horizontal else 50
        y0 = int(H * (0.40 if horizontal else 0.52))
        lines = [self.dt(t['op'], 26 if horizontal else 30, MINT, x0, y0 - 70, start=0.2, max_w=W - 2 * x0),
                 self.dt(t['place'], big, 'white', x0, y0, start=0.4, max_w=W - 2 * x0)]
        if t['sub']:
            lines.append(self.dt(t['sub'], 34 if horizontal else 40, 'white', x0, y0 + big + 18, bold=False,
                                 start=0.6, alpha=0.9, max_w=W - 2 * x0))
        lines.append(self.dt(t['price'], 52 if horizontal else 60, MINT, x0, y0 + big + 90, start=0.9))
        graph = (f"[0:v]scale={W * 2}:{H * 2}:force_original_aspect_ratio=increase,crop={W * 2}:{H * 2},"
                 f"zoompan=z='1.12-0.08*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},"
                 f"drawbox=x=0:y=0:w=iw:h=ih:color={INK}@0.55:t=fill," + ','.join(lines) + ",format=yuv420p[v]")
        out = self.work / f'{self.mode}-00.mp4'
        self.encode(['-loop', '1', '-framerate', str(FPS), '-t', str(CARD_S), '-i', str(src)], graph, CARD_S, out)
        return out

    def outro(self, idx: int) -> Path:
        W, H = self.W, self.H
        horizontal = self.mode == 'horizontal'
        lw = 260 if horizontal else 300
        top = int(H * (0.16 if horizontal else 0.26))
        ty = top + int(lw * 865 / 1024) + (20 if horizontal else 30)
        graph = ';'.join([
            f"color=c={CREAM}:s={W}x{H}:r={FPS}:d={CARD_S}[bg]",
            f"[0:v]scale={lw}:-1,format=rgba,fade=t=in:st=0:d=0.6:alpha=1[logo]",
            f"[bg][logo]overlay=(W-w)/2:{top}," + ','.join([
                self.dt('Ubica', 64, TEAL, '(w-tw)/2', ty, start=0.3),
                self.dt('by AMI Fincas', 28, DARK_TEAL, '(w-tw)/2', ty + 82, bold=False, start=0.5),
                self.dt(f'Llama o escribe:  {PHONE}', 32, INK, '(w-tw)/2', ty + 150, start=0.9),
                self.dt(WEB, 30, TEAL, '(w-tw)/2', ty + 200, bold=False, start=1.1),
            ]) + ",format=yuv420p[v]",
        ])
        out = self.work / f'{self.mode}-{idx:02d}.mp4'
        self.encode(['-loop', '1', '-i', str(LOGO)], graph, CARD_S, out)
        return out

    def video(self, photos: list[tuple[Path, tuple[int, int]]], out: Path):
        segs = [self.intro(photos[0][0])] + [self.photo(i + 1, src, size) for i, (src, size) in enumerate(photos)]
        segs.append(self.outro(len(segs)))
        durs = [CARD_S] + [PHOTO_S] * len(photos) + [CARD_S]
        inputs, parts, last, offset = [], [], '[0:v]', 0.0
        for s in segs:
            inputs += ['-i', str(s)]
        for k in range(1, len(segs)):
            offset += durs[k - 1] - FADE
            kind = 'fade' if k in (1, len(segs) - 1) else 'smoothleft'
            parts.append(f"{last}[{k}:v]xfade=transition={kind}:duration={FADE}:offset={offset:.3f}[x{k}]")
            last = f'[x{k}]'
        ffmpeg([*inputs, '-filter_complex', ';'.join(parts), '-map', last, '-c:v', 'libx264', '-preset', 'slow',
                '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)])
        for s in segs:
            s.unlink()


def prepare_photos(p: dict, work: Path) -> list[tuple[Path, tuple[int, int]]]:
    """Descarga las fotos, las endereza según el EXIF y las reduce (más rápido y sin sorpresas de giro)."""
    from PIL import Image, ImageOps
    photos = []
    for i, url in enumerate((p.get('images') or [])[:MAX_PHOTOS]):
        if not isinstance(url, str) or not url.startswith('http'):
            continue
        raw = work / f'raw-{i:02d}'
        try:
            raw.write_bytes(http('GET', url, timeout=60)[1])
            img = ImageOps.exif_transpose(Image.open(raw)).convert('RGB')
        except Exception as e:  # una foto rota no impide el vídeo
            log(f'  foto {i + 1} descartada: {e}')
            continue
        img.thumbnail((1920, 1920))
        dst = work / f'foto-{i:02d}.jpg'
        img.save(dst, quality=90)
        photos.append((dst, img.size))
    return photos


# ---------- Supabase Storage ----------

def storage(method: str, path: str, data: bytes | None = None, headers: dict | None = None):
    h = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', **(headers or {})}
    return http(method, f'{SUPABASE_URL}/storage/v1/{path}', data, h)


def public_url(name: str) -> str:
    return f'{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{name}'


def ensure_bucket():
    body = json.dumps({'id': BUCKET, 'name': BUCKET, 'public': True, 'file_size_limit': 30 * 1024 * 1024,
                       'allowed_mime_types': ['video/mp4', 'application/json']}).encode()
    try:
        storage('POST', 'bucket', body, {'Content-Type': 'application/json'})
        log(f'Bucket {BUCKET} creado')
    except urllib.error.HTTPError as e:
        if e.code not in (400, 409):  # ya existe
            raise


def upload(name: str, data: bytes, content_type: str, max_age: int):
    storage('POST', f'object/{BUCKET}/{name}', data,
            {'Content-Type': content_type, 'x-upsert': 'true', 'cache-control': f'max-age={max_age}'})


def remove(names: list[str]):
    if names:
        storage('DELETE', f'object/{BUCKET}', json.dumps({'prefixes': names}).encode(), {'Content-Type': 'application/json'})


def load_index() -> dict:
    if not SUPABASE_URL:
        return {}
    try:
        # Se lee con la clave (sin caché de CDN) para no rehacer vídeos por un índice desfasado
        return json.loads(storage('GET', f'object/{BUCKET}/index.json')[1]).get('videos', {})
    except urllib.error.HTTPError as e:
        if e.code in (400, 404):
            return {}
        raise


# ---------- principal ----------

def main() -> int:
    if not CHECK_ONLY and (not FONT_REGULAR or not FONT_BOLD):
        sys.exit('No se encuentran las fuentes (FONT_REGULAR / FONT_BOLD)')
    upload_enabled = bool(SUPABASE_URL and SUPABASE_KEY)
    if not upload_enabled:
        log('Sin SUPABASE_URL / SUPABASE_SECRET_KEY: los vídeos se quedan en', OUT)

    props, skip = [], 0
    while True:
        page = get_json(f'{API}/properties?skip={skip}&limit=100')
        props += page
        if len(page) < 100:
            break
        skip += 100
    props = [p for p in props if p.get('images')]
    if ONLY_ID:
        props = [p for p in props if str(p.get('id')) == ONLY_ID]
    log(f'{len(props)} inmuebles con fotos')

    if upload_enabled and not CHECK_ONLY:
        ensure_bucket()
    index = load_index()
    if CHECK_ONLY:
        live = {str(p['id']) for p in props}
        pending = (FORCE or any(index.get(str(p['id']), {}).get('hash') != fingerprint(p) for p in props)
                   or (not ONLY_ID and any(k not in live for k in index)))
        log('Hay cambios' if pending else 'Sin cambios')
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
                f.write(f'pending={str(pending).lower()}\n')
        return 0
    OUT.mkdir(parents=True, exist_ok=True)
    old_index = json.dumps(index, sort_keys=True)
    done = failed = 0

    for p in props:
        pid, fp = str(p['id']), fingerprint(p)
        if not FORCE and index.get(pid, {}).get('hash') == fp:
            continue
        if done >= MAX_PER_RUN:
            log('Tope por ejecución alcanzado; el resto, en la siguiente')
            break
        log(f'Inmueble {pid}: {p.get("title")}')
        work = OUT / f'tmp-{pid}'
        shutil.rmtree(work, ignore_errors=True)
        work.mkdir(parents=True)
        shutil.copy(FONT_REGULAR, work / 'regular.ttf')
        shutil.copy(FONT_BOLD, work / 'bold.ttf')
        try:
            photos = prepare_photos(p, work)
            if not photos:
                log('  sin fotos válidas')
                continue
            t = texts(p)
            files = {}
            for mode in ('horizontal', 'vertical'):
                name = f'{pid}-{fp[:10]}-{mode[0]}.mp4'
                started = time.time()
                Render(work, mode, t).video(photos, OUT / name)
                log(f'  {mode}: {(OUT / name).stat().st_size // 1024} KB en {time.time() - started:.0f} s')
                files[mode] = name
            if upload_enabled:
                for name in files.values():
                    upload(name, (OUT / name).read_bytes(), 'video/mp4', 31536000)
                old = [v for k, v in index.get(pid, {}).get('files', {}).items() if v not in files.values()]
                remove(old)
            index[pid] = {
                'hash': fp,
                'files': files,
                'horizontal': public_url(files['horizontal']) if upload_enabled else files['horizontal'],
                'vertical': public_url(files['vertical']) if upload_enabled else files['vertical'],
                'poster': p['images'][0],
                'updated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            }
            done += 1
        except Exception as e:
            failed += 1
            log(f'  ERROR: {e}')
        finally:
            shutil.rmtree(work, ignore_errors=True)

    # Inmuebles retirados: fuera del índice y sus vídeos borrados (se pueden regenerar siempre)
    if not ONLY_ID:
        live = {str(p['id']) for p in props}
        for pid in [k for k in index if k not in live]:
            if upload_enabled:
                remove(list(index[pid].get('files', {}).values()))
            log(f'Inmueble {pid} retirado: vídeos borrados')
            del index[pid]

    if json.dumps(index, sort_keys=True) != old_index:
        body = json.dumps({'version': 1, 'videos': index}, ensure_ascii=False, indent=1).encode()
        if upload_enabled:
            upload('index.json', body, 'application/json', 60)
        (OUT / 'index.json').write_bytes(body)
    log(f'Hechos: {done}, con error: {failed}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
