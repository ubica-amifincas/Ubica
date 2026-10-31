import { useState, useEffect, useId } from 'react';
import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  HomeModernIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { apiService } from '../services/apiService';
import { ubicaHref } from '../utils/site';

const FOUNDED = 2014;

// Datos de contacto (los mismos que la ficha de Google Maps de cada sede)
export const MAIN_PHONE = '676 62 69 33';
export const WHATSAPP_NUMBER = '34676626933';
export const EMAIL = 'info@amifincas.es';

export const tel = (phone: string) => `tel:+34${phone.replace(/\s+/g, '')}`;

export function SectionHeading({ eyebrow, title, description, center = true }: { eyebrow?: string; title: string; description?: string; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto mb-12 max-w-3xl text-center' : 'mb-10'}>
      {eyebrow && <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-[#23707f] dark:text-[#8fd0c3]">{eyebrow}</p>}
      <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white md:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>}
    </div>
  );
}

const fieldClass =
  'block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#2D8A9D] focus:outline-none focus:ring-2 focus:ring-[#2D8A9D]/40 dark:border-white/10 dark:bg-slate-900 dark:text-white';

/** Formulario de presupuesto: llega a info@amifincas.es como "[AMI Fincas] Presupuesto: …". */
export function QuoteForm() {
  const { t } = useLanguage();
  const id = useId();
  const [form, setForm] = useState({ name: '', phone: '', email: '', service: 'community', homes: '', town: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const services = ['community', 'rental', 'insurance', 'other'] as const;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || form.phone.replace(/\D/g, '').length < 9 || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setError(t('ami.quote.required'));
      return;
    }
    setError('');
    setStatus('sending');
    const serviceLabel = t(`ami.quote.service.${form.service}`);
    const lines = [
      `${t('ami.quote.service')}: ${serviceLabel}`,
      form.homes && `${t('ami.quote.homes')}: ${form.homes}`,
      form.town && `${t('ami.quote.town')}: ${form.town}`,
      form.message && `\n${form.message}`,
    ].filter(Boolean);
    try {
      await apiService.sendContact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        subject: `Presupuesto: ${serviceLabel}`,
        message: lines.join('\n'),
        source: 'ami',
      });
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : t('ami.quote.error'));
    }
  };

  if (status === 'sent') {
    return (
      <div role="status" className="flex flex-col items-center justify-center rounded-3xl border border-[#2D8A9D]/30 bg-white p-10 text-center shadow-sm dark:bg-white/5">
        <CheckCircleIcon className="h-14 w-14 text-[#2D8A9D]" aria-hidden="true" />
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{t('ami.quote.success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-name`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.name')} *</label>
          <input id={`${id}-name`} value={form.name} onChange={set('name')} autoComplete="name" className={fieldClass} required />
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.phone')} *</label>
          <input id={`${id}-phone`} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={fieldClass} required />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.email')} *</label>
          <input id={`${id}-email`} type="email" inputMode="email" value={form.email} onChange={set('email')} autoComplete="email" className={fieldClass} required />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-service`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.service')}</label>
          <select id={`${id}-service`} value={form.service} onChange={set('service')} className={fieldClass}>
            {services.map(s => <option key={s} value={s}>{t(`ami.quote.service.${s}`)}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-homes`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.homes')}</label>
          <input id={`${id}-homes`} type="number" inputMode="numeric" min="1" value={form.homes} onChange={set('homes')} className={fieldClass} />
        </div>
        <div>
          <label htmlFor={`${id}-town`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.town')}</label>
          <input id={`${id}-town`} value={form.town} onChange={set('town')} autoComplete="address-level2" className={fieldClass} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-message`} className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">{t('ami.quote.message')}</label>
          <textarea id={`${id}-message`} value={form.message} onChange={set('message')} rows={3} maxLength={3000} className={fieldClass} />
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-400">
        <p className="font-semibold text-slate-800 dark:text-slate-200">Protección de datos personales</p>
        <p className="mt-1">
          Utilizaremos sus datos para responder consultas y realizar análisis estadísticos. Para más información sobre el
          tratamiento y sus derechos, consulte la{' '}
          <Link to="/privacy" className="font-medium text-[#23707f] underline dark:text-[#8fd0c3]">política de privacidad</Link>.
        </p>
      </div>

      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}

      <button type="submit" disabled={status === 'sending'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#23707f] px-6 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#1b5a66] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#23707f] focus-visible:ring-offset-2 disabled:opacity-60">
        {status === 'sending' ? t('ami.quote.sending') : t('ami.quote.submit')}
      </button>
    </form>
  );
}

export default function AmiFincas() {
  const { t } = useLanguage();
  const years = new Date().getFullYear() - FOUNDED;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t('ami.whatsapp.text'))}`;

  // La barra fija de "Llamar / WhatsApp" en móvil no debe tapar el final de la página
  useEffect(() => {
    document.body.classList.add('has-bottom-cta');
    return () => document.body.classList.remove('has-bottom-cta');
  }, []);

  const services = [
    { icon: BuildingOfficeIcon, title: t('ami.services.item1.title'), description: t('ami.services.item1.desc') },
    { icon: HomeModernIcon, title: t('ami.services.item2.title'), description: t('ami.services.item2.desc') },
    { icon: WrenchScrewdriverIcon, title: t('ami.services.item3.title'), description: t('ami.services.item3.desc') },
    { icon: UserGroupIcon, title: t('ami.services.item4.title'), description: t('ami.services.item4.desc') },
    { icon: DocumentChartBarIcon, title: t('ami.services.item5.title'), description: t('ami.services.item5.desc') },
    { icon: ShieldCheckIcon, title: t('ami.services.item6.title'), description: t('ami.services.item6.desc'), badge: t('ami.services.ownBroker') },
  ];

  const benefits = [1, 2, 3, 4, 5, 6].map(i => t(`ami.benefits.item${i}`));
  const steps = [1, 2, 3].map(i => ({ title: t(`ami.switch.step${i}.title`), description: t(`ami.switch.step${i}.desc`) }));
  const faqs = [1, 2, 3, 4, 5, 6].map(i => ({ q: t(`ami.faq.q${i}`), a: t(`ami.faq.a${i}`) }));

  const offices = [
    {
      city: t('ami.offices.murcia'),
      address: 'Calle Ángeles, 41, 30007 Murcia',
      phones: ['676 62 69 33', '609 00 88 64'],
      schedule: t('ami.offices.schedule.murcia'),
      directions: 'https://maps.google.com/?cid=4566582778045489499',
      photo: '/ami-fincas/sede-murcia.webp',
      photoAlt: t('ami.offices.photoMurcia'),
    },
    {
      city: t('ami.offices.sanpedro'),
      address: 'Calle Panamá, 2A, 30740 San Pedro del Pinatar (Murcia)',
      phones: ['968 17 91 80', '609 00 88 64'],
      schedule: t('ami.offices.schedule.sanpedro'),
      directions: 'https://maps.google.com/?cid=16413795408017082990',
      photo: '/ami-fincas/sede-san-pedro.webp',
      photoAlt: t('ami.offices.photo'),
      page: { href: '/san-pedro-del-pinatar', label: t('ami.coast.more') },
    },
  ];

  const facts = [
    { value: t('ami.facts.since'), label: t('ami.facts.sinceSub', { years }) },
    { value: t('ami.facts.offices'), label: t('ami.facts.officesSub') },
    { value: t('ami.facts.area'), label: t('ami.facts.areaSub') },
  ];

  return (
    <>
      <div className="bg-slate-50 font-sans text-slate-900 dark:bg-[#0f172a] dark:text-white">
        {/* Portada */}
        <section className="relative overflow-hidden pb-16 pt-10 md:pb-24 md:pt-16">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#A2D18D]/20 blur-3xl" aria-hidden="true" />
          <div className="page-container relative">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <h1 className="font-display text-4xl font-black leading-[1.1] md:text-6xl">
                  <span className="bg-gradient-to-r from-[#5fa64a] to-[#2D8A9D] bg-clip-text text-transparent">{t('ami.hero.title1')}</span>
                  <br />
                  {t('ami.hero.title2')}
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 md:text-xl lg:mx-0">
                  {t('ami.hero.description')}
                </p>

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <a href="#presupuesto" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#23707f] px-7 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#1b5a66]">
                    {t('ami.hero.cta.quote')}
                    <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                  </a>
                  <a href={tel(MAIN_PHONE)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-4 text-base font-bold text-slate-900 transition-colors hover:border-[#2D8A9D] dark:border-white/15 dark:bg-white/5 dark:text-white">
                    <PhoneIcon className="h-5 w-5 text-[#23707f] dark:text-[#8fd0c3]" aria-hidden="true" />
                    {t('ami.hero.cta.call')} {MAIN_PHONE}
                  </a>
                </div>
              </div>

              <div className="w-full max-w-md flex-1 lg:max-w-none">
                <img src="/ami-fincas/comunidad-piscina.webp" alt="" width={1024} height={940}
                  className="mx-auto w-full max-w-[520px] rounded-[2.5rem] shadow-2xl shadow-slate-900/20" />
              </div>
            </div>
          </div>
        </section>

        {/* Datos de la empresa: solo los que se pueden comprobar */}
        <section aria-label="AMI Fincas en cifras" className="border-y border-slate-200 bg-white dark:border-white/5 dark:bg-white/5">
          <div className="page-container">
            <dl className="grid grid-cols-1 divide-y divide-slate-200 py-6 dark:divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {facts.map(fact => (
                <div key={fact.value} className="px-4 py-3 text-center">
                  <dt className="sr-only">{fact.label}</dt>
                  <dd className="font-display text-xl font-black text-[#23707f] dark:text-[#8fd0c3] md:text-2xl">{fact.value}</dd>
                  <dd className="mt-1 text-sm text-slate-500 dark:text-slate-400">{fact.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Servicios */}
        <section id="servicios" className="scroll-mt-20 py-16 md:py-24">
          <div className="page-container">
            <SectionHeading eyebrow={t('ami.services.badge')} title={t('ami.services.title')} description={t('ami.services.description')} />
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map(service => (
                <li key={service.title} className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A2D18D] to-[#2D8A9D] text-white shadow-sm">
                      <service.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    {service.badge && (
                      <span className="rounded-full bg-[#2D8A9D]/10 px-3 py-1 text-xs font-bold text-[#23707f] dark:text-[#8fd0c3]">{service.badge}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold">{service.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{service.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Por qué AMI Fincas */}
        <section className="bg-white py-16 dark:bg-white/[0.03] md:py-24">
          <div className="page-container">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
              <div className="flex-1">
                <SectionHeading title={t('ami.benefits.title')} description={t('ami.benefits.description')} center={false} />
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {benefits.map(benefit => (
                    <li key={benefit} className="flex items-center gap-3 font-semibold text-slate-700 dark:text-slate-300">
                      <CheckCircleIcon className="h-6 w-6 shrink-0 text-[#2D8A9D]" aria-hidden="true" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full max-w-md flex-1 lg:max-w-none">
                <img src="/ami-fincas/3d_circular.webp" alt="" width={1024} height={940} loading="lazy"
                  className="mx-auto w-full max-w-[460px] rounded-[2.5rem] shadow-xl shadow-slate-900/15" />
              </div>
            </div>
          </div>
        </section>

        {/* Cambiar de administrador */}
        <section id="cambiar" className="scroll-mt-20 py-16 md:py-24">
          <div className="page-container">
            <SectionHeading title={t('ami.switch.title')} description={t('ami.switch.description')} />
            <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {steps.map((step, i) => (
                <li key={step.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#23707f] font-display text-lg font-black text-white" aria-hidden="true">{i + 1}</span>
                  <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Presupuesto */}
        <section id="presupuesto" className="scroll-mt-20 bg-white py-16 dark:bg-white/[0.03] md:py-24">
          <div className="page-container">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-5 lg:gap-16">
              <div className="lg:col-span-2">
                <SectionHeading title={t('ami.quote.title')} description={t('ami.quote.description')} center={false} />
                <div className="space-y-4 rounded-3xl bg-slate-50 p-6 dark:bg-white/5">
                  <p className="font-bold text-slate-900 dark:text-white">{t('ami.quote.talk')}</p>
                  <p className="text-slate-600 dark:text-slate-400">{t('ami.quote.talkSub')}</p>
                  <a href={tel(MAIN_PHONE)} className="flex items-center gap-3 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <PhoneIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> {MAIN_PHONE}
                  </a>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> WhatsApp
                  </a>
                  <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <EnvelopeIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> {EMAIL}
                  </a>
                </div>
              </div>
              <div className="lg:col-span-3">
                <QuoteForm />
              </div>
            </div>
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" className="scroll-mt-20 py-16 md:py-24">
          <div className="page-container">
            <SectionHeading title={t('ami.faq.title')} />
            <div className="mx-auto max-w-3xl space-y-3">
              {faqs.map(faq => (
                <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Sedes */}
        <section id="contacto" className="scroll-mt-20 bg-white py-16 dark:bg-white/[0.03] md:py-24">
          <div className="page-container">
            <SectionHeading eyebrow={t('ami.offices.badge')} title={t('ami.offices.title')} description={t('ami.offices.description')} />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {offices.map(office => (
                <article key={office.city} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="h-60 bg-slate-100 dark:bg-slate-800 md:h-72">
                    <img src={office.photo} alt={office.photoAlt} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <div className="space-y-4 p-6 md:p-8">
                    <h3 className="text-2xl font-black">{office.city}</h3>
                    <p className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                      <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2D8A9D]" aria-hidden="true" /> {office.address}
                    </p>
                    <p className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                      <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2D8A9D]" aria-hidden="true" />
                      <span><span className="sr-only">{t('ami.offices.hours')}: </span>{office.schedule}</span>
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {office.phones.map(phone => (
                        <a key={phone} href={tel(phone)} className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                          <PhoneIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> {phone}
                        </a>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <a href={office.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#23707f] hover:underline dark:text-[#8fd0c3]">
                        {t('ami.offices.directions')} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                      </a>
                      {'page' in office && office.page && (
                        <Link to={office.page.href} className="inline-flex items-center gap-1 font-semibold text-[#23707f] hover:underline dark:text-[#8fd0c3]">
                          {office.page.label} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Ubica, el portal inmobiliario del grupo */}
        <section className="py-16 md:py-24">
          <div className="page-container">
            <div className="flex flex-col items-center gap-8 overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white md:flex-row md:p-12">
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-black md:text-4xl">{t('ami.ubica.title')}</h2>
                <p className="mt-4 max-w-xl text-lg text-slate-300">{t('ami.ubica.description')}</p>
                <a href={ubicaHref('/')} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-slate-900 transition-colors hover:bg-slate-100">
                  {t('ami.ubica.cta')} <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              </div>
              <img src="/ami-fincas/3d_islands.webp" alt="" width={1024} height={940} loading="lazy" className="w-full max-w-xs rounded-3xl md:max-w-sm" />
            </div>
          </div>
        </section>
      </div>

      {/* Llamar / WhatsApp siempre a mano en móvil y tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95 lg:hidden" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-md gap-3">
          <a href={tel(MAIN_PHONE)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#23707f] py-3 font-bold text-white">
            <PhoneIcon className="h-5 w-5" aria-hidden="true" /> {t('ami.mobile.call')}
          </a>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 py-3 font-bold text-slate-900 dark:border-white/15 dark:text-white">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#25D366]" aria-hidden="true" /> {t('ami.mobile.whatsapp')}
          </a>
        </div>
      </div>
    </>
  );
}
