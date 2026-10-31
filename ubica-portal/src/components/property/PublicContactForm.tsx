import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';
import { apiService } from '../../services/apiService';

interface Props {
  propertyId: number;
  title: string;
  url: string;
}

const fieldClass = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-600 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-400';

/**
 * Contactar sin cuenta: el mensaje llega al buzón de Ubica por el formulario de contacto público,
 * con el anuncio y su enlace. Quien tiene cuenta escribe desde la ficha y sigue la conversación en su panel.
 */
const PublicContactForm = forwardRef<HTMLInputElement, Props>(function PublicContactForm({ propertyId, title, url }, nameRef) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: t('details.public.default', { title }) });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.message.trim().length < 10) {
      setStatus('error');
      setError(t('details.public.short'));
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await apiService.sendContact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: `Interés en: ${title} (ref. ${propertyId})`,
        message: `${form.message.trim()}\n\n${url}`,
        source: 'ubica',
      });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('details.sendError'));
    }
  };

  if (status === 'sent') {
    return (
      <div role="status" className="mt-4 flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center dark:border-emerald-800 dark:bg-emerald-950">
        <CheckCircleIcon className="h-10 w-10 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
        <p className="mt-2 font-semibold text-emerald-900 dark:text-emerald-100">{t('details.public.sent')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('details.public.name')} *</span>
          <input ref={nameRef} value={form.name} onChange={set('name')} autoComplete="name" required maxLength={200} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('details.public.phone')}</span>
          <input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" maxLength={50} className={fieldClass} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('details.public.email')} *</span>
        <input type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" required maxLength={200} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('details.public.message')} *</span>
        <textarea value={form.message} onChange={set('message')} rows={3} required maxLength={4000} className={`${fieldClass} resize-none`} />
      </label>
      {status === 'error' && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="submit" disabled={status === 'sending'}
        className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60">
        {status === 'sending' ? t('details.public.sending') : t('details.sendMessage')}
      </button>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {t('details.public.privacy')}{' '}
        <Link to="/privacy" className="underline hover:text-emerald-700 dark:hover:text-emerald-300">{t('details.public.privacyLink')}</Link>.{' '}
        {t('details.public.account')}{' '}
        <Link to="/login" className="font-medium text-emerald-700 underline dark:text-emerald-300">{t('nav.login')}</Link>
      </p>
    </form>
  );
});

export default PublicContactForm;
