import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CameraIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { useAuth, useAuthenticatedFetch } from '../contexts/AuthContext';
import { PROPERTY_TYPES, publishesDirectly } from '../utils/propertyStatus';
import type { ListingDraft } from '../services/apiService';
import { takeShared } from '../utils/shareInbox';

/**
 * Subir un inmueble desde el móvil en pocos pasos grandes, pensado para quien recibe por WhatsApp
 * las fotos y las características que manda el propietario: fotos de la galería, pegar el mensaje
 * (la IA rellena los datos y escribe la descripción), repasar y publicar.
 * Todo se guarda en este dispositivo mientras tanto: si le llaman a mitad, sigue donde lo dejó.
 * También se puede llegar compartiendo desde WhatsApp (Compartir → Ubica, en Android con la app instalada):
 * las fotos se suben y el texto se lee como si se hubiera pegado.
 */

const STORAGE_KEY = 'ubica-quick-listing';
const STEPS = ['Fotos', 'Mensaje', 'Datos', 'Descripción', 'Revisar'] as const;
// Los tipos más habituales primero: son los que más se usan
const TYPE_CHOICES = ['flat', 'house', 'chalet', 'penthouse', 'apartment', 'townhouse', 'duplex', 'studio', 'villa', 'land', 'commercial'];

interface Draft {
  step: number;
  photos: string[];
  message: string;
  operation: 'sale' | 'rent';
  type: string;
  price: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  city: string;
  address: string;
  features: string[];
  title: string;
  description: string;
}

const EMPTY: Draft = {
  step: 0, photos: [], message: '', operation: 'sale', type: '', price: '', bedrooms: 0, bathrooms: 0,
  area: '', city: '', address: '', features: [], title: '', description: '',
};

function loadDraft(): Draft {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...EMPTY, ...saved } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Reduce la foto en el móvil (máx. 1920 px, JPEG) para que suba rápido con datos móviles. */
async function shrinkPhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // si el navegador no puede, se sube tal cual
  }
}

/** Coordenadas de la dirección (OpenStreetMap); si no se encuentra, el anuncio se publica sin chincheta. */
async function locate(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const query = [address, city, 'España'].filter(Boolean).join(', ');
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&q=${encodeURIComponent(query)}`,
      { signal: controller.signal, headers: { 'Accept-Language': 'es' } });
    clearTimeout(timer);
    const [hit] = await res.json();
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}

const eur = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const typeLabel = (value: string) => PROPERTY_TYPES.find(t => t.value === value)?.label ?? value;

const bigButton = 'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold transition-colors disabled:opacity-50';
const primary = `${bigButton} bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800`;
const secondary = `${bigButton} border-2 border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700`;
const inputClass = 'w-full rounded-2xl border-2 border-gray-300 bg-white px-4 py-3 text-lg text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-0 dark:border-gray-600 dark:bg-gray-800 dark:text-white';
const labelClass = 'mb-2 block text-base font-semibold text-gray-900 dark:text-white';

export default function QuickListing() {
  const { user } = useAuth();
  const api = useAuthenticatedFetch();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState<'' | 'reading' | 'writing' | 'publishing'>('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ id: number; outcome: 'published' | 'review' | 'draft' } | null>(null);
  const [notice, setNotice] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const reviewFirst = !publishesDirectly(user);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); } catch { /* sin almacenamiento: no se recuerda */ }
  }, [draft]);

  useEffect(() => { window.scrollTo(0, 0); }, [draft.step, done]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const go = (step: number) => { setError(''); set('step', step); };

  const addPhotos = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setError('');
    const list = Array.from(files).slice(0, 30);
    setUploading(list.length);
    try {
      for (const file of list) {
        const [url] = await api.uploadImages([await shrinkPhoto(file)]);
        if (url) setDraft(d => ({ ...d, photos: [...d.photos, url] }));
        setUploading(n => n - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir alguna foto');
    } finally {
      setUploading(0);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  // Lo compartido desde WhatsApp (lo deja el service worker). Se mira siempre al abrir, no solo con ?compartido:
  // si antes hubo que iniciar sesión, se llega aquí sin el parámetro
  const sharedChecked = useRef(false);
  useEffect(() => {
    if (sharedChecked.current) return;
    sharedChecked.current = true;
    const flag = new URLSearchParams(window.location.search).get('compartido');
    if (flag) navigate('/publicar', { replace: true }); // recargar no debe repetir el aviso
    (async () => {
      const shared = await takeShared();
      if (!shared) {
        if (flag) setNotice('No ha llegado lo que has compartido. Vuelve a compartirlo desde WhatsApp con «Compartir → Ubica».');
        return;
      }
      const parts: string[] = [];
      if (shared.files.length) {
        parts.push(shared.files.length === 1 ? 'Ha llegado 1 foto de WhatsApp.' : `Han llegado ${shared.files.length} fotos de WhatsApp.`);
        setDraft(d => ({ ...d, step: 0 }));
        await addPhotos(shared.files);
      }
      if (shared.text) {
        const message = draft.message.trim() ? [draft.message.trim(), shared.text].join('\n\n') : shared.text;
        set('message', message);
        parts.push('Hemos leído el mensaje y rellenado los datos: repásalos.');
        await readMessage(message);
      } else {
        parts.push('Ahora comparte también el mensaje del vendedor (Compartir → Ubica), o pulsa «Siguiente».');
      }
      setNotice(parts.join(' '));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const makeCover = (url: string) => set('photos', [url, ...draft.photos.filter(p => p !== url)]);
  const removePhoto = (url: string) => set('photos', draft.photos.filter(p => p !== url));

  const pasteMessage = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) set('message', text);
    } catch {
      setError('El móvil no deja pegar desde aquí: mantén pulsado el recuadro y elige «Pegar».');
    }
  };

  const applyDraft = (d: ListingDraft, onlyText = false) => setDraft(prev => ({
    ...prev,
    ...(onlyText ? {} : {
      operation: d.operation ?? prev.operation,
      type: d.type ?? prev.type,
      price: d.price != null ? String(Math.round(d.price)) : prev.price,
      bedrooms: d.bedrooms ?? prev.bedrooms,
      bathrooms: d.bathrooms ?? prev.bathrooms,
      area: d.area != null ? String(Math.round(d.area)) : prev.area,
      city: d.city ?? prev.city,
      address: d.address ?? prev.address,
      features: d.features?.length ? d.features : prev.features,
    }),
    title: d.title ?? prev.title,
    description: d.description ?? prev.description,
  }));

  const readMessage = async (message = draft.message) => {
    if (message.trim().length < 3) {
      setError('Pega primero el mensaje del vendedor.');
      return;
    }
    setBusy('reading');
    setError('');
    try {
      const d = await api.draftListing(message);
      applyDraft(d);
      set('step', 2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el mensaje. Puedes rellenar los datos a mano.');
    } finally {
      setBusy('');
    }
  };

  // Descripción a partir de los datos ya repasados (y del mensaje, si lo hay)
  const writeDescription = async () => {
    setBusy('writing');
    setError('');
    const facts = [
      draft.operation === 'rent' ? 'Alquiler' : 'Venta',
      draft.type && typeLabel(draft.type),
      draft.city && `en ${draft.city}`,
      draft.bedrooms ? `${draft.bedrooms} habitaciones` : '',
      draft.bathrooms ? `${draft.bathrooms} baños` : '',
      draft.area && `${draft.area} m2`,
      draft.price && `${draft.price} €${draft.operation === 'rent' ? ' al mes' : ''}`,
      draft.features.join(', '),
    ].filter(Boolean).join('. ');
    try {
      const result = await api.draftListing(`${facts}.\n${draft.message}`.slice(0, 4000));
      if (!result.description) {
        setError('Ahora mismo no podemos escribirla automáticamente. Escríbela tú o inténtalo dentro de un rato.');
        return;
      }
      applyDraft(result, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo escribir la descripción');
    } finally {
      setBusy('');
    }
  };

  const missing = (): string | null => {
    if (!draft.type) return 'Elige el tipo de inmueble.';
    if (!(Number(draft.price) > 0)) return 'Escribe el precio.';
    if (!draft.city.trim()) return 'Escribe el municipio.';
    return null;
  };

  const autoTitle = () => draft.title.trim()
    || `${typeLabel(draft.type)}${draft.bedrooms ? ` de ${draft.bedrooms} habitaciones` : ''} en ${draft.city.trim()}`;

  const publish = async (asDraft: boolean) => {
    const problem = missing();
    if (problem) {
      setError(problem);
      go(2);
      return;
    }
    setBusy('publishing');
    setError('');
    try {
      const coordinates = await locate(draft.address.trim(), draft.city.trim());
      const status = asDraft ? 'draft' : draft.operation === 'rent' ? 'for-rent' : 'for-sale';
      const created = await api.createUserProperty({
        title: autoTitle(),
        type: draft.type,
        status,
        price: Number(draft.price),
        bedrooms: draft.bedrooms || null,
        bathrooms: draft.bathrooms || null,
        area: Number(draft.area) || null,
        location: draft.city.trim(),
        address: draft.address.trim(),
        description: draft.description.trim(),
        features: draft.features,
        images: draft.photos,
        ...(coordinates ? { coordinates } : {}),
      });
      localStorage.removeItem(STORAGE_KEY);
      setDone({ id: created.id, outcome: asDraft ? 'draft' : created.status === 'pending-review' ? 'review' : 'published' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el anuncio');
    } finally {
      setBusy('');
    }
  };

  const startOver = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDraft(EMPTY);
    setDone(null);
  };

  const myListings = user?.role === 'realtor' ? '/realtor/propiedades' : '/dashboard/properties';

  if (done) {
    return (
      <Screen title="Listo" onClose={() => navigate(myListings)}>
        <div className="py-8 text-center">
          <CheckCircleIcon className="mx-auto h-20 w-20 text-emerald-600" aria-hidden="true" />
          <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            {{ published: '¡Publicado!', review: 'Enviado a revisión', draft: 'Guardado sin publicar' }[done.outcome]}
          </p>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
            {{
              published: 'Ya aparece en Ubica.',
              review: 'Lo publicaremos en cuanto lo revisemos.',
              draft: 'Lo tienes en tus inmuebles para publicarlo cuando quieras.',
            }[done.outcome]}
          </p>
        </div>
        <div className="space-y-3">
          <button type="button" onClick={startOver} className={primary}><PlusIcon className="h-6 w-6" /> Subir otro inmueble</button>
          <Link to={`/property/${done.id}`} className={secondary}>Ver el anuncio</Link>
          <Link to={myListings} className={secondary}>Mis inmuebles</Link>
        </div>
      </Screen>
    );
  }

  const step = draft.step;
  const back = step > 0 ? () => go(step - 1) : undefined;

  return (
    <Screen title={STEPS[step]} step={step} onBack={back} onClose={() => navigate(myListings)}>
      {notice && (
        <p role="status" className="mb-5 rounded-2xl bg-emerald-50 p-4 text-base font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {notice}
        </p>
      )}
      {step === 0 && (
        <div className="space-y-5">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Elige las fotos que te ha mandado el vendedor, o compártelas desde WhatsApp con «Compartir → Ubica». La primera será la portada.
          </p>
          <input ref={fileInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
          <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading > 0} className={primary}>
            <CameraIcon className="h-6 w-6" /> {uploading > 0 ? `Subiendo fotos… (faltan ${uploading})` : 'Añadir fotos'}
          </button>
          {draft.photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3">
              {draft.photos.map((url, i) => (
                <li key={url} className="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
                  <img src={url} alt={`Foto ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                  {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2.5 py-1 text-sm font-semibold text-white">Portada</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                    <button type="button" onClick={() => makeCover(url)} aria-label={`Poner la foto ${i + 1} de portada`}
                      className="rounded-full bg-white/90 p-2 text-amber-500">
                      {i === 0 ? <StarSolidIcon className="h-6 w-6" /> : <StarIcon className="h-6 w-6" />}
                    </button>
                    <button type="button" onClick={() => removePhoto(url)} aria-label={`Quitar la foto ${i + 1}`}
                      className="rounded-full bg-white/90 p-2 text-red-600">
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Footer error={error}>
            <button type="button" onClick={() => go(1)} disabled={uploading > 0} className={primary}>
              {draft.photos.length > 0 ? 'Siguiente' : 'Seguir sin fotos'}
            </button>
          </Footer>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Copia en WhatsApp el mensaje del vendedor con las características y pégalo aquí. Rellenaremos los datos por ti.
          </p>
          <label htmlFor="quick-message" className="sr-only">Mensaje del vendedor</label>
          <textarea id="quick-message" rows={8} value={draft.message} onChange={(e) => set('message', e.target.value)} maxLength={4000}
            placeholder="Ej.: Vendo piso en Murcia, 3 habitaciones, 2 baños, 95 m2, con terraza. Precio 185.000 €"
            className={inputClass} />
          {'clipboard' in navigator && 'readText' in navigator.clipboard && (
            <button type="button" onClick={pasteMessage} className={secondary}><ClipboardDocumentIcon className="h-6 w-6" /> Pegar</button>
          )}
          <Footer error={error}>
            <button type="button" onClick={() => readMessage()} disabled={busy === 'reading'} className={primary}>
              <SparklesIcon className="h-6 w-6" /> {busy === 'reading' ? 'Leyendo el mensaje…' : 'Rellenar los datos'}
            </button>
            <button type="button" onClick={() => go(2)} className="w-full py-3 text-base font-semibold text-emerald-700 underline dark:text-emerald-400">
              Prefiero escribirlos yo
            </button>
          </Footer>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <fieldset>
            <legend className={labelClass}>¿Venta o alquiler?</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['sale', 'rent'] as const).map(op => (
                <button key={op} type="button" aria-pressed={draft.operation === op} onClick={() => set('operation', op)}
                  className={`h-14 rounded-2xl border-2 text-lg font-semibold ${draft.operation === op
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}`}>
                  {op === 'sale' ? 'Venta' : 'Alquiler'}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelClass}>Tipo de inmueble</legend>
            <div className="flex flex-wrap gap-2">
              {TYPE_CHOICES.map(value => (
                <button key={value} type="button" aria-pressed={draft.type === value} onClick={() => set('type', value)}
                  className={`rounded-full border-2 px-4 py-2.5 text-base font-semibold ${draft.type === value
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}`}>
                  {typeLabel(value)}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="quick-price" className={labelClass}>Precio {draft.operation === 'rent' ? '(€ al mes)' : '(€)'}</label>
            <input id="quick-price" inputMode="numeric" value={draft.price} onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
              placeholder={draft.operation === 'rent' ? '650' : '185000'} className={`${inputClass} text-2xl font-semibold`} />
            {Number(draft.price) > 0 && <p className="mt-1 text-base text-gray-600 dark:text-gray-400">{eur(Number(draft.price))}{draft.operation === 'rent' ? ' al mes' : ''}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stepper label="Habitaciones" value={draft.bedrooms} onChange={(v) => set('bedrooms', v)} />
            <Stepper label="Baños" value={draft.bathrooms} onChange={(v) => set('bathrooms', v)} />
          </div>

          <div>
            <label htmlFor="quick-area" className={labelClass}>Metros cuadrados</label>
            <input id="quick-area" inputMode="numeric" value={draft.area} onChange={(e) => set('area', e.target.value.replace(/\D/g, ''))}
              placeholder="95" className={inputClass} />
          </div>

          <div>
            <label htmlFor="quick-city" className={labelClass}>Municipio</label>
            <input id="quick-city" value={draft.city} onChange={(e) => set('city', e.target.value)} placeholder="Murcia" autoComplete="address-level2" className={inputClass} />
          </div>
          <div>
            <label htmlFor="quick-address" className={labelClass}>Calle y número <span className="font-normal text-gray-500">(opcional)</span></label>
            <input id="quick-address" value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="Calle Mayor, 12" autoComplete="street-address" className={inputClass} />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Con la calle, el inmueble aparece en el mapa.</p>
          </div>

          <Footer error={error}>
            <button type="button" onClick={() => { const p = missing(); if (p) setError(p); else go(3); }} className={primary}>Siguiente</button>
          </Footer>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label htmlFor="quick-title" className={labelClass}>Título</label>
            <input id="quick-title" value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={120}
              placeholder={draft.type && draft.city ? autoTitle() : 'Piso con terraza en Murcia'} className={inputClass} />
          </div>
          <div>
            <label htmlFor="quick-description" className={labelClass}>Descripción</label>
            <textarea id="quick-description" rows={7} value={draft.description} onChange={(e) => set('description', e.target.value)} maxLength={2000}
              placeholder="Cuenta lo mejor del inmueble…" className={inputClass} />
          </div>
          <button type="button" onClick={writeDescription} disabled={busy === 'writing'} className={secondary}>
            <SparklesIcon className="h-6 w-6" /> {busy === 'writing' ? 'Escribiendo…' : draft.description ? 'Escribirla de nuevo' : 'Escríbela por mí'}
          </button>
          <Footer error={error}>
            <button type="button" onClick={() => go(4)} className={primary}>Siguiente</button>
          </Footer>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <article className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            {draft.photos[0]
              ? <img src={draft.photos[0]} alt="Portada" className="aspect-[4/3] w-full object-cover" />
              : <div className="flex aspect-[4/3] items-center justify-center bg-gray-100 text-lg text-gray-500 dark:bg-gray-700">Sin fotos</div>}
            <div className="space-y-2 p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Number(draft.price) > 0 ? eur(Number(draft.price)) : '—'}{draft.operation === 'rent' ? ' /mes' : ''}
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{autoTitle()}</p>
              <p className="text-base text-gray-600 dark:text-gray-300">
                {[draft.operation === 'rent' ? 'Alquiler' : 'Venta', draft.bedrooms ? `${draft.bedrooms} hab.` : '', draft.bathrooms ? `${draft.bathrooms} baños` : '',
                  draft.area && `${draft.area} m²`, draft.photos.length ? `${draft.photos.length} fotos` : ''].filter(Boolean).join(' · ')}
              </p>
              {draft.description && <p className="line-clamp-4 text-base text-gray-700 dark:text-gray-300">{draft.description}</p>}
            </div>
          </article>
          <div className="grid grid-cols-3 gap-2 text-base">
            {[['Fotos', 0], ['Datos', 2], ['Texto', 3]].map(([label, target]) => (
              <button key={label} type="button" onClick={() => go(target as number)}
                className="rounded-xl border-2 border-gray-300 py-2.5 font-semibold text-gray-800 dark:border-gray-600 dark:text-gray-100">
                Cambiar {String(label).toLowerCase()}
              </button>
            ))}
          </div>
          <Footer error={error}>
            <button type="button" onClick={() => publish(false)} disabled={busy === 'publishing'} className={primary}>
              {busy === 'publishing' ? 'Guardando…' : reviewFirst ? 'Enviar a revisión' : 'Publicar'}
            </button>
            <button type="button" onClick={() => publish(true)} disabled={busy === 'publishing'}
              className="w-full py-3 text-base font-semibold text-gray-700 underline dark:text-gray-300">
              Guardar sin publicar
            </button>
          </Footer>
        </div>
      )}
    </Screen>
  );
}

function Screen({ title, step, onBack, onClose, children }: {
  title: string; step?: number; onBack?: () => void; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-lg items-center gap-2 px-3 py-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Atrás" className="rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
              <ArrowLeftIcon className="h-7 w-7" />
            </button>
          ) : <span className="w-11" />}
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {step !== undefined && <p className="text-sm text-gray-500 dark:text-gray-400">Paso {step + 1} de {STEPS.length}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Salir (se guarda lo que llevas)" className="rounded-full p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">
            <XMarkIcon className="h-7 w-7" />
          </button>
        </div>
        {step !== undefined && (
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true">
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        )}
      </header>
      <main className="mx-auto max-w-lg px-4 pb-10 pt-5">{children}</main>
    </div>
  );
}

function Footer({ error, children }: { error: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pt-2">
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-base text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      {children}
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const btn = 'flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-gray-300 bg-white text-gray-800 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100';
  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label={`Menos ${label.toLowerCase()}`} className={btn}>
          <MinusIcon className="h-6 w-6" />
        </button>
        <span className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white" aria-live="polite">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(20, value + 1))} aria-label={`Más ${label.toLowerCase()}`} className={btn}>
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
