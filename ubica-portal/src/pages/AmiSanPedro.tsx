import { useEffect } from 'react';
import {
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ClockIcon,
  EnvelopeIcon,
  GlobeEuropeAfricaIcon,
  LanguageIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { EMAIL, MAIN_PHONE, QuoteForm, SectionHeading, WHATSAPP_NUMBER, tel } from './AmiFincas';

// Sede de San Pedro del Pinatar (los mismos datos que su ficha de Google Maps y la portada)
const OFFICE = {
  address: 'Calle Panamá, 2A, 30740 San Pedro del Pinatar (Murcia)',
  phones: ['968 17 91 80', '609 00 88 64'],
  directions: 'https://maps.google.com/?cid=16413795408017082990',
  photo: '/ami-fincas/sede-san-pedro.webp',
};

// Localidades que se atienden desde la sede (las mismas que en src/seo/content.js)
const TOWNS: { region: 'murcia' | 'alicante'; names: string[] }[] = [
  { region: 'murcia', names: ['San Pedro del Pinatar', 'Lo Pagán', 'San Javier', 'Santiago de la Ribera'] },
  { region: 'alicante', names: ['Pilar de la Horadada', 'Torrevieja'] },
];

/**
 * Página de la sede de San Pedro del Pinatar: administración de comunidades y urbanizaciones en el Mar Menor
 * y el sur de Alicante. Sirve a quien busca un administrador en la costa, no solo "en Murcia".
 */
export default function AmiSanPedro() {
  const { t } = useLanguage();
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(t('ami.whatsapp.text'))}`;

  useEffect(() => {
    document.body.classList.add('has-bottom-cta');
    return () => document.body.classList.remove('has-bottom-cta');
  }, []);

  const points = [
    { icon: SunIcon, title: t('ami.coast.point1.title'), description: t('ami.coast.point1.desc') },
    { icon: GlobeEuropeAfricaIcon, title: t('ami.coast.point2.title'), description: t('ami.coast.point2.desc') },
    { icon: LanguageIcon, title: t('ami.coast.point3.title'), description: t('ami.coast.point3.desc') },
    { icon: ShieldCheckIcon, title: t('ami.coast.point4.title'), description: t('ami.coast.point4.desc') },
  ];
  const steps = [1, 2, 3].map(i => ({ title: t(`ami.switch.step${i}.title`), description: t(`ami.switch.step${i}.desc`) }));
  const faqs = [1, 2, 3, 4, 5].map(i => ({ q: t(`ami.coast.faq.q${i}`), a: t(`ami.coast.faq.a${i}`) }));

  return (
    <>
      <div className="bg-slate-50 font-sans text-slate-900 dark:bg-[#0f172a] dark:text-white">
        {/* Portada */}
        <section className="relative overflow-hidden pb-16 pt-10 md:pb-24 md:pt-16">
          <div className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#8fd0c3]/25 blur-3xl" aria-hidden="true" />
          <div className="page-container relative">
            <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
              <div className="flex-1 text-center lg:text-left">
                <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#23707f] dark:text-[#8fd0c3]">{t('ami.coast.eyebrow')}</p>
                <h1 className="font-display text-4xl font-black leading-[1.1] md:text-5xl">{t('ami.coast.title')}</h1>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 md:text-xl lg:mx-0">
                  {t('ami.coast.intro')}
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                  <a href="#presupuesto" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#23707f] px-7 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#1b5a66]">
                    {t('ami.hero.cta.quote')}
                    <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                  </a>
                  <a href={tel(OFFICE.phones[0])} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-4 text-base font-bold text-slate-900 transition-colors hover:border-[#2D8A9D] dark:border-white/15 dark:bg-white/5 dark:text-white">
                    <PhoneIcon className="h-5 w-5 text-[#23707f] dark:text-[#8fd0c3]" aria-hidden="true" />
                    {t('ami.hero.cta.call')} {OFFICE.phones[0]}
                  </a>
                </div>
              </div>
              <div className="w-full max-w-md flex-1 lg:max-w-none">
                <img src={OFFICE.photo} alt={t('ami.offices.photo')} width={1024} height={768}
                  className="mx-auto aspect-[4/3] w-full max-w-[520px] rounded-[2.5rem] object-cover shadow-2xl shadow-slate-900/20" />
              </div>
            </div>
          </div>
        </section>

        {/* Zonas */}
        <section aria-labelledby="zonas" className="border-y border-slate-200 bg-white py-12 dark:border-white/5 dark:bg-white/5">
          <div className="page-container">
            <h2 id="zonas" className="text-center text-2xl font-black md:text-3xl">{t('ami.coast.zones.title')}</h2>
            <p className="mt-2 text-center text-slate-600 dark:text-slate-400">{t('ami.coast.zones.description')}</p>
            <div className="mt-8 flex flex-col items-center gap-5 md:flex-row md:justify-center md:gap-10">
              {TOWNS.map(group => (
                <div key={group.region} className="text-center">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{t(`ami.coast.region.${group.region}`)}</p>
                  <ul className="flex flex-wrap justify-center gap-2">
                    {group.names.map(name => (
                      <li key={name} className="inline-flex items-center gap-1.5 rounded-full bg-[#2D8A9D]/10 px-4 py-2 font-semibold text-[#1b5a66] dark:text-[#8fd0c3]">
                        <MapPinIcon className="h-4 w-4" aria-hidden="true" /> {name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo trabajamos en la costa */}
        <section className="py-16 md:py-24">
          <div className="page-container">
            <SectionHeading title={t('ami.coast.points.title')} description={t('ami.coast.points.description')} />
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {points.map(point => (
                <li key={point.title} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#A2D18D] to-[#2D8A9D] text-white shadow-sm">
                    <point.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="text-xl font-bold">{point.title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{point.description}</p>
                </li>
              ))}
            </ul>

            {/* Para los propietarios extranjeros, en su idioma aunque la web esté en español */}
            <div lang="en" className="mt-8 flex flex-col items-start gap-4 rounded-3xl bg-slate-900 p-6 text-white dark:border dark:border-white/10 dark:bg-white/5 md:flex-row md:items-center md:p-8">
              <LanguageIcon className="h-10 w-10 shrink-0 text-[#8fd0c3]" aria-hidden="true" />
              <div>
                <h3 className="text-xl font-black">{t('ami.coast.english.title')}</h3>
                <p className="mt-1 text-slate-300">{t('ami.coast.english.text')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* La oficina */}
        <section id="oficina" className="scroll-mt-20 bg-white py-16 dark:bg-white/[0.03] md:py-24">
          <div className="page-container">
            <SectionHeading title={t('ami.coast.office.title')} description={t('ami.coast.office.description')} />
            <div className="mx-auto max-w-2xl space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/5 md:p-8">
              <p className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2D8A9D]" aria-hidden="true" /> {OFFICE.address}
              </p>
              <p className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#2D8A9D]" aria-hidden="true" />
                <span><span className="sr-only">{t('ami.offices.hours')}: </span>{t('ami.offices.schedule.sanpedro')}</span>
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {OFFICE.phones.map(phone => (
                  <a key={phone} href={tel(phone)} className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <PhoneIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> {phone}
                  </a>
                ))}
              </div>
              <a href={OFFICE.directions} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#23707f] hover:underline dark:text-[#8fd0c3]">
                {t('ami.offices.directions')} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* Cambiar de administrador */}
        <section className="py-16 md:py-24">
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
                  <a href={tel(OFFICE.phones[0])} className="flex items-center gap-3 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <PhoneIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> {OFFICE.phones[0]}
                  </a>
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg font-bold text-slate-900 hover:text-[#23707f] dark:text-white">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-[#2D8A9D]" aria-hidden="true" /> WhatsApp {MAIN_PHONE}
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
              {faqs.map((faq, i) => (
                <details key={faq.q} lang={i === 3 ? 'en' : undefined} className="group rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm open:shadow-md dark:border-white/10 dark:bg-white/5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <ChevronDownIcon className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-10 text-center">
              <Link to="/" className="inline-flex items-center gap-1 font-semibold text-[#23707f] hover:underline dark:text-[#8fd0c3]">
                {t('ami.coast.back')} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </section>
      </div>

      {/* Llamar / WhatsApp siempre a mano en móvil y tablet */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/95 lg:hidden" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-md gap-3">
          <a href={tel(OFFICE.phones[0])} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#23707f] py-3 font-bold text-white">
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
