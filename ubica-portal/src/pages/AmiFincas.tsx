import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView, animate } from 'framer-motion';
import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  StarIcon,
  MapPinIcon,
  ClockIcon,
  ShieldCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../hooks/useLanguage';

const AMIGreen = '#A2D18D';
const AMITeal = '#2D8A9D';

const PageTransition = ({ t }: { t: any }) => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8, ease: "easeInOut" }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-50 dark:bg-slate-900 border-none"
  >
    <div className="text-center">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mb-4"
      >
        <img
          src="/ami-fincas/favAMI.png"
          alt="AMI Fincas"
          className="h-40 md:h-56 mx-auto mb-8 dark:brightness-110 drop-shadow-2xl scale-110"
        />
        <h2 className="text-3xl font-black tracking-[0.4em] uppercase text-emerald-600 dark:text-emerald-400">
          AMI Fincas
        </h2>
      </motion.div>
      <motion.h1
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, duration: 1, type: "spring" }}
        className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white leading-tight"
      >
        {t('ami.transition.p1')} <br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A2D18D] to-[#2D8A9D]">
          {t('ami.transition.p2')}
        </span>
      </motion.h1>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ delay: 1.2, duration: 1 }}
        className="h-1 bg-gradient-to-r from-[#A2D18D] to-[#2D8A9D] mt-8 max-w-xs mx-auto rounded-full"
      />
    </div>
  </motion.div>
);

export default function AmiFincas() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  
  // Parallax configuration hooks
  const { scrollYProgress } = useScroll();
  const yParallaxHeavy = useTransform(scrollYProgress, [0, 1], [0, -250]);
  const yParallaxMedium = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const yParallaxLight = useTransform(scrollYProgress, [0, 1], [0, -80]);

  // Framer-motion counter logic component
  const Counter = ({ from, to, duration = 2 }: { from: number; to: number; duration?: number }) => {
    const nodeRef = useRef<HTMLSpanElement>(null);
    const inView = useInView(nodeRef, { once: true, margin: "-100px" });

    useEffect(() => {
      const node = nodeRef.current;
      if (node && inView) {
        const controls = animate(from, to, {
          duration: duration,
          ease: "easeOut",
          onUpdate(value) {
            node.textContent = Math.round(value).toString();
          },
        });
        return () => controls.stop();
      }
    }, [from, to, duration, inView]);

    return <span ref={nodeRef} />;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Effect to dynamically handle Favicon and Document Title exclusively for this page
  useEffect(() => {
    // Save original values
    const originalTitle = document.title;
    const faviconNode = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    const appleIconNode = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
    
    const originalFaviconHref = faviconNode?.href;
    const originalAppleIconHref = appleIconNode?.href;

    // Set new values
    document.title = "Ami Fincas - Administración de fincas";
    
    if (faviconNode) faviconNode.href = "/ami-fincas/favAMI.png";
    if (appleIconNode) appleIconNode.href = "/ami-fincas/favAMI.png";

    // Cleanup function: Restore original title and icons on unmount (when leaving route)
    return () => {
      document.title = originalTitle;
      if (faviconNode && originalFaviconHref) faviconNode.href = originalFaviconHref;
      if (appleIconNode && originalAppleIconHref) appleIconNode.href = originalAppleIconHref;
    };
  }, []);

  const services = [
    {
      icon: BuildingOfficeIcon,
      title: t('ami.services.item1.title'),
      description: t('ami.services.item1.desc')
    },
    {
      icon: BuildingOfficeIcon,
      title: t('ami.services.item2.title'),
      description: t('ami.services.item2.desc')
    },
    {
      icon: WrenchScrewdriverIcon,
      title: t('ami.services.item3.title'),
      description: t('ami.services.item3.desc')
    },
    {
      icon: UserGroupIcon,
      title: t('ami.services.item4.title'),
      description: t('ami.services.item4.desc')
    },
    {
      icon: DocumentChartBarIcon,
      title: t('ami.services.item5.title'),
      description: t('ami.services.item5.desc')
    },
    {
      icon: ShieldCheckIcon,
      title: t('ami.services.item6.title'),
      description: t('ami.services.item6.desc'),
      highlight: true
    }
  ];

  const benefits = [
    t('ami.benefits.item1'),
    t('ami.benefits.item2'),
    t('ami.benefits.item3'),
    t('ami.benefits.item4'),
    t('ami.benefits.item5'),
    t('ami.benefits.item6')
  ];

  const offices = [
    {
      city: t('ami.offices.murcia'),
      address: 'Calle Angeles, 41, 30007 Murcia',
      phones: ['+34 676 62 69 33', '+34 609 00 88 64'],
      schedule: t('ami.offices.schedule.murcia'),
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3143.9!2d-1.08!3d37.99!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd638!2sCalle%20Angeles%2C%2041%2C%2030007%20Murcia!5e0!3m2!1ses!2ses!4v1620000000000!5m2!1ses!2ses'
    },
    {
      city: t('ami.offices.sanpedro'),
      address: 'C. Panamá, 2A, 30740 San Pedro del Pinatar, Murcia',
      phones: ['+34 968 17 91 80', '+34 609 00 88 64'],
      schedule: t('ami.offices.schedule.sanpedro'),
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3143.9!2d-0.78!3d37.83!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd63!2sC.%20Panam%C3%A1%2C%202A%2C%2030740%20San%20Pedro%20del%20Pinatar!5e0!3m2!1ses!2ses!4v1620000000000!5m2!1ses!2ses'
    }
  ];

  const MapIframe = ({ src }: { src: string }) => {
    const [mapLoaded, setMapLoaded] = useState(false);
    return (
      <>
        {!mapLoaded && (
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 animate-pulse flex items-center justify-center -z-0">
            <span className="text-slate-400 font-medium">Cargando mapa...</span>
          </div>
        )}
        <iframe
          src={src}
          onLoad={() => setMapLoaded(true)}
          className={`w-full h-full border-0 absolute z-10 grayscale dark:invert filter opacity-50 contrast-125 group-hover:opacity-80 group-hover:grayscale-0 dark:group-hover:invert-0 transition-all duration-700 ${mapLoaded ? 'visible' : 'invisible'}`}
          loading="lazy"
        />
      </>
    );
  };

  return (
    <>
      <div className="hidden">
        {/* SEO Injector for AI Search Engines & Crawlers */}
        <h1 className="sr-only">AMI Fincas - Administración de Fincas y Correduría de Seguros en Murcia</h1>
        <p className="sr-only">Expertos en administración de comunidades, correduría de seguros y gestión integral inmobiliaria en la Región de Murcia. Transparencia, tecnología y profesionalidad garantizada.</p>
        <div itemScope itemType="https://schema.org/LocalBusiness">
          <span itemProp="name">AMI Fincas</span>
          <span itemProp="description">Administración de fincas y correduría de seguros experta en Murcia. Gestionamos tu comunidad y protegemos tu inversión inmobiliaria mediante seguros especializados.</span>
          <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
            <span itemProp="streetAddress">Calle Angeles, 41</span>
            <span itemProp="addressLocality">Murcia</span>
            <span itemProp="postalCode">30007</span>
            <span itemProp="addressCountry">ES</span>
          </div>
          <span itemProp="telephone">+34 968 17 91 80</span>
        </div>
      </div>

      <AnimatePresence>
        {isLoading && <PageTransition t={t} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden font-sans selection:bg-emerald-500/30"
      >
        {/* Hero Section */}
        <div className="relative pt-12 pb-24 md:pt-16 md:pb-40">
          {/* Cinematic gradient background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05)_0%,transparent_100%)]" />
          <div className="absolute top-0 right-0 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-emerald-500/10 rounded-full blur-[80px] md:blur-[120px] -translate-y-1/2 translate-x-1/2" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              {/* Left Column: Content */}
              <div className="flex-1 text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8 }}
                  className="mb-6 inline-block"
                >
                  <img
                    src="/ami-fincas/favAMI.png"
                    alt="AMI Fincas Logo"
                    className="h-32 md:h-48 w-auto object-contain font-black brightness-110 drop-shadow-xl"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <div className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 font-bold text-xs uppercase tracking-widest mb-8">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span>{t('ami.hero.certified')}</span>
                  </div>

                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight md:leading-[1.1] mb-8">
                    {t('ami.hero.title1')} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A2D18D] to-[#2D8A9D]">{t('ami.hero.title2')}</span> <br />
                    {t('ami.hero.title3')}
                  </h1>

                  <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                    {t('ami.hero.description')}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                    <motion.a
                      href="#contacto"
                      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}
                      whileTap={{ scale: 0.98 }}
                      className="px-10 py-5 rounded-2xl bg-gradient-to-r from-[#A2D18D] to-[#2D8A9D] text-white font-black text-lg shadow-2xl transition-all duration-300"
                    >
                      {t('ami.hero.cta.contact')}
                    </motion.a>
                    <motion.a
                      href="#servicios"
                      whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                      className="px-10 py-5 rounded-2xl bg-slate-200/50 dark:bg-white/5 border border-slate-300 dark:border-white/10 backdrop-blur-md text-slate-900 dark:text-white font-black text-lg hover:shadow-xl transition-all duration-300"
                    >
                      {t('ami.hero.cta.services')}
                    </motion.a>
                  </div>
                </motion.div>
              </div>

              {/* Right Column: The "Warm" 3D Image */}
              <motion.div
                initial={{ opacity: 0, rotate: 5, scale: 0.8 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                transition={{ delay: 0.4, duration: 1, type: 'spring' }}
                style={{ y: yParallaxLight }}
                className="flex-1 relative group"
              >
                <div className="relative z-10 w-full max-w-[550px] mx-auto">
                  <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-[80px] group-hover:bg-emerald-500/30 transition-all duration-700" />

                  <img
                    src="/ami-fincas/3d_warm.jpg"
                    alt="3D Floating Real Estate Island"
                    className="w-full h-auto drop-shadow-[0_45px_45px_rgba(0,0,0,0.6)] group-hover:rotate-2 group-hover:scale-105 group-hover:drop-shadow-[0_55px_55px_rgba(16,185,129,0.3)] transition-all duration-700 pointer-events-auto rounded-[3rem]"
                  />

                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-10 -right-4 bg-[#1e293b]/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl"
                  >
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">{t('ami.hero.id')}</p>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Stats/Ticker Section */}
        <div className="py-12 bg-slate-100 dark:bg-white/5 border-y border-slate-200 dark:border-white/5 backdrop-blur-sm relative z-20 shadow-[-10px_-20px_40px_rgba(0,0,0,0.1)]">
          <div className="container mx-auto px-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-12 md:gap-24 opacity-80 transition-all">
              <div className="flex items-center space-x-3 group">
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  +<Counter from={0} to={10} duration={2.5} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest leading-tight text-slate-500 dark:text-slate-400">{t('ami.stats.years').split(' ').map((word: string, i: number) => <span key={i}>{word}{i === 1 ? <br /> : ' '}</span>)}</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Counter from={0} to={2} duration={1.5} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest leading-tight text-slate-500 dark:text-slate-400">{t('ami.stats.offices').split(' ').map((word: string, i: number) => <span key={i}>{word}{i === 0 ? <br /> : ' '}</span>)}</span>
              </div>
              <div className="flex items-center space-x-3 group">
                <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                  <Counter from={0} to={100} duration={3} />%
                </span>
                <span className="text-xs font-bold uppercase tracking-widest leading-tight text-slate-500 dark:text-slate-400">{t('ami.stats.digital').split(' ').map((word: string, i: number) => <span key={i}>{word}{i === 0 ? <br /> : ' '}</span>)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section with Gears Image */}
        <section id="servicios" className="py-32 relative">
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[100px]" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              {/* Left: Gears 3D Image */}
              <div className="lg:w-1/2 order-2 lg:order-1 relative z-10">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  style={{ y: yParallaxMedium }}
                  className="relative group block"
                >
                  <div className="absolute inset-0 bg-teal-500/10 rounded-[3rem] blur-3xl group-hover:bg-teal-500/20 transition-all duration-700" />
                  <img
                    src="/ami-fincas/3d_gears.jpg"
                    alt="3D Property Mechanics"
                    className="w-full h-auto rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/5 group-hover:rotate-1 group-hover:scale-105 transition-all duration-700 pointer-events-auto"
                  />
                </motion.div>
              </div>

              {/* Right: Service Cards */}
              <div className="lg:w-1/2 order-1 lg:order-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="mb-12"
                >
                  <h2 className="text-emerald-500 font-black tracking-[0.2em] uppercase text-sm mb-4">{t('ami.services.badge')}</h2>
                  <h3 className="text-4xl md:text-5xl font-black mb-6">{t('ami.services.title')}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
                    {t('ami.services.description')}
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20 md:auto-rows-[1fr]">
                  {services.map((service, index) => {
                    let bentoClass = "";
                    if (index === 1) bentoClass = "md:row-span-2";
                    else if (index === 5) bentoClass = "md:col-span-2";
                    else bentoClass = "md:col-span-1";

                    return (
                    <motion.div
                      key={service.title}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className={`
                        p-6 md:p-8 flex flex-col justify-center rounded-[2rem] border shadow-sm transition-all duration-300 group overflow-hidden relative
                        ${bentoClass}
                        ${service.highlight 
                          ? 'bg-gradient-to-br from-white to-emerald-50 dark:from-slate-800 dark:to-slate-900 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:-translate-y-1' 
                          : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-emerald-500/50 dark:shadow-none hover:-translate-y-1'
                        }
                      `}
                    >
                      {/* Glow effect that tracks the mouse - approximated with CSS center radial gradient */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.1)_0%,transparent_70%)] pointer-events-none" />

                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg ${service.highlight ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-[#A2D18D] to-[#2D8A9D]'}`}>
                          <service.icon className="w-6 h-6" />
                        </div>
                        {service.highlight && (
                          <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase rounded-full shadow-inner flex items-center space-x-1 animate-pulse">
                            <SparklesIcon className="w-3 h-3" />
                            <span>Nuevo</span>
                          </div>
                        )}
                      </div>
                      
                      <h4 className="text-lg font-bold mb-2">{service.title}</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{service.description}</p>
                    </motion.div>
                  )})}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section with Circular/Arrow Image */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-4xl md:text-6xl font-black mb-10 leading-tight">
                    {t('ami.benefits.title').split(' ').map((word: string, i: number) => {
                      const isGray = i >= 3;
                      return (
                        <span key={i} className={isGray ? 'text-slate-500' : ''}>{word} </span>
                      );
                    })}
                  </h2>
                  <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 leading-relaxed">
                    {t('ami.benefits.description')}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center space-x-4 group">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                          <CheckCircleIcon className="w-5 h-5 text-emerald-400 group-hover:text-white" />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-white transition-colors">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>

              <div className="flex-1 relative z-20">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  style={{ y: yParallaxHeavy }}
                  className="group"
                >
                  <img
                    src="/ami-fincas/3d_circular.jpg"
                    alt="Success Growth 3D"
                    className="w-full max-w-[500px] mx-auto drop-shadow-[0_40px_40px_rgba(16,185,129,0.2)] rounded-[3rem] group-hover:-rotate-3 group-hover:scale-105 transition-all duration-1000"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Offices Section with Maps */}
        <section id="contacto" className="py-32 bg-slate-50 dark:bg-[#0a0f1c] transition-colors">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-emerald-500 font-black tracking-widest uppercase text-xs mb-4">{t('ami.offices.badge')}</h2>
              <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6">{t('ami.offices.title')}</h3>
              <p className="text-slate-600 dark:text-slate-500 text-xl max-w-2xl mx-auto">{t('ami.offices.description')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
              {offices.map((office, idx) => (
                <motion.div
                  key={office.city}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.2 }}
                  className="group relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[3rem] overflow-hidden hover:border-emerald-500/50 transition-all duration-500 shadow-xl dark:shadow-2xl"
                >
                  <div className="h-64 md:h-80 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <MapIframe src={office.mapUrl} />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0a0f1c] via-transparent to-transparent pointer-events-none z-20" />
                  </div>

                  <div className="p-10 relative">
                    <div className="inline-block px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-tighter mb-6">
                      {t('ami.offices.sede')} {office.city}
                    </div>
                    <h4 className="text-3xl font-black mb-8">{office.city}</h4>

                    <div className="space-y-6">
                      <div className="flex items-start space-x-4">
                        <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                          <MapPinIcon className="w-6 h-6 text-[#A2D18D]" />
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors mt-2">{office.address}</span>
                      </div>
                      {office.phones.map((phone, pIdx) => (
                        <div key={pIdx} className="flex items-center space-x-4">
                          <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                            <PhoneIcon className="w-6 h-6 text-[#A2D18D]" />
                          </div>
                          <a href={`tel:${phone.replace(/\s+/g, '')}`} className="text-2xl font-black text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
                            {phone}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Fun Fact Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-24 max-w-4xl mx-auto"
            >
              <div className="relative p-8 md:p-10 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 dark:border-emerald-400/10 backdrop-blur-xl overflow-hidden flex flex-col md:flex-row items-center gap-8 group">
                <div className="absolute inset-0 bg-white/40 dark:bg-black/20 pointer-events-none" />
                
                {/* Decorative glowing blob */}
                <div className="absolute -left-20 -top-20 w-40 h-40 bg-teal-400/20 blur-[50px] rounded-full group-hover:bg-teal-400/30 transition-colors duration-700 pointer-events-none" />

                <div className="relative z-10 w-16 h-16 shrink-0 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-100 dark:border-slate-700/50 rotate-3 group-hover:rotate-6 transition-transform">
                  <span className="text-3xl">💡</span>
                </div>

                <div className="relative z-10 flex-1 text-center md:text-left">
                  <h4 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest mb-2">
                    Dato Curioso
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    ¿Te has fijado en los pequeños logos triangulares que aparecen sobre las islas y los edificios en las imágenes 3D de esta página? Son el sello de <strong className="text-emerald-600 dark:text-emerald-400">Ubica</strong>. AMI Fincas forma parte integral del sólido ecosistema tecnológico de nuestro portal inmobiliario. 
                    <a 
                      href="https://ubica.amifincas.es/about" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center ml-2 text-emerald-600 dark:text-emerald-400 hover:text-teal-600 dark:hover:text-teal-300 font-bold underline decoration-emerald-500/30 hover:decoration-teal-500 transition-all underline-offset-4"
                    >
                      Descubre más sobre Ubica aquí
                      <span className="ml-1">→</span>
                    </a>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Enhanced Large CTA - Asymmetric Glassmorphism Design */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-32 relative group"
            >
              <div className="relative rounded-[3rem] md:rounded-[4rem] bg-gradient-to-br from-white to-slate-50 dark:from-[#111827] dark:to-[#0f172a] border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl group-hover:shadow-[0_40px_100px_rgba(16,185,129,0.15)] transition-all duration-700">
                {/* Asymmetric Background Elements */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnIGhlaWdodD0nMTAwJz48cmVjdCB3aWR0aD0nMTAwJz0gaGVpZ2h0PScxMDAnIGZpbGw9J25vbmUnIHN0cm9rZT0nIzBmMHdpZHRoPScwLjUnLz48L3N2Zz4=')] bg-[length:40px_40px]" />

                <div className="grid grid-cols-1 lg:grid-cols-2 lg:gap-0 h-full">
                  {/* Text & Interaction Column */}
                  <div className="p-12 md:p-20 flex flex-col justify-center relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mb-10 shadow-lg"
                    >
                      <BuildingOfficeIcon className="w-8 h-8 text-white" />
                    </motion.div>

                    <h3 className="text-4xl md:text-6xl font-black mb-6 leading-tight text-slate-900 dark:text-white">
                      {t('ami.cta.title')}
                    </h3>
                    
                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-12 font-medium">
                      Conecta con nosotros hoy mismo. Únete a las administraciones que confían en AMI Fincas para proteger su inversión y su comunidad.
                    </p>

                    <div className="space-y-6">
                      <motion.a
                        whileHover={{ x: 10, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href="mailto:info@amifincas.es"
                        className="w-full sm:w-auto inline-flex items-center justify-between px-8 py-5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-lg shadow-[0_20px_40px_rgba(0,0,0,0.1)] transition-all"
                      >
                        <span className="flex items-center space-x-3">
                          <EnvelopeIcon className="w-6 h-6" />
                          <span>{t('ami.cta.button')}</span>
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-black/10 flex items-center justify-center ml-6">
                          →
                        </div>
                      </motion.a>

                      <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-8 items-start sm:items-center">
                        <div>
                          <span className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Líneas Directas</span>
                          <div className="flex flex-col gap-2">
                            <a href="tel:+34676626933" className="text-lg font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4 text-emerald-500" />
                              <span className="font-mono">676 62 69 33</span>
                            </a>
                            <a href="tel:+34968179180" className="text-lg font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-500 transition-colors flex items-center gap-2">
                              <PhoneIcon className="w-4 h-4 text-emerald-500" />
                              <span className="font-mono">968 17 91 80</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3D Image Showcase Column */}
                  <div className="relative h-96 lg:h-auto min-h-[400px] bg-emerald-50/50 dark:bg-[#151f32] p-8 overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-100/50 dark:to-black/30 pointer-events-none" />
                    
                    <motion.div
                      animate={{
                        y: [0, -15, 0],
                        rotate: [0, -1, 1, 0]
                      }}
                      transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="relative z-10"
                    >
                      <div className="absolute inset-0 bg-teal-400/20 blur-[60px] rounded-full" />
                      <img
                        src="/ami-fincas/3d_islands.jpg"
                        alt="Ami Network"
                        className="w-full max-w-[450px] object-contain relative z-20 drop-shadow-[0_45px_45px_rgba(0,0,0,0.5)] rounded-[3rem] border-8 border-white/5"
                      />
                    </motion.div>
                    
                    {/* Floating Info Badges */}
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                      className="absolute top-12 left-12 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-700 z-30"
                    >
                      <ShieldCheckIcon className="w-6 h-6 text-emerald-500" />
                      <div className="text-left leading-tight">
                        <span className="block text-xs text-slate-500 font-bold uppercase">Seguros</span>
                        <span className="block text-sm text-slate-900 dark:text-white font-black">+500 Pólizas</span>
                      </div>
                    </motion.div>

                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                      className="absolute bottom-12 right-12 px-4 py-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur shadow-xl rounded-2xl flex items-center gap-3 border border-slate-200 dark:border-slate-700 z-30"
                    >
                      <BuildingOfficeIcon className="w-6 h-6 text-teal-500" />
                      <div className="text-left leading-tight">
                        <span className="block text-xs text-slate-500 font-bold uppercase">Gestión</span>
                        <span className="block text-sm text-slate-900 dark:text-white font-black">+2000 Propietarios</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>


      </motion.div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
