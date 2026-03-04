import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldCheckIcon
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
          className="h-24 mx-auto mb-6 dark:brightness-110"
        />
        <h2 className="text-2xl font-black tracking-[0.3em] uppercase text-emerald-600 dark:text-emerald-400">
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
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
      description: t('ami.services.item6.desc')
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

  return (
    <>
      <AnimatePresence>
        {isLoading && <PageTransition t={t} />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="min-h-screen bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden font-sans selection:bg-emerald-500/30"
      >
        {/* Hero Section — Full viewport immersive */}
        <div className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden -mt-20 pt-20">
          {/* Background image with overlay */}
          <div className="absolute inset-0">
            <img
              src="/ami-fincas/3d_warm.jpg"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-slate-900/95" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />
          </div>

          {/* Floating orbs */}
          <div className="absolute top-1/4 right-1/4 w-48 md:w-96 h-48 md:h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-32 md:w-64 h-32 md:h-64 bg-teal-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />

          {/* Content */}
          <div className="container mx-auto px-5 sm:px-6 lg:px-8 relative z-10 py-12 md:py-0">
            <div className="max-w-4xl">
              {/* Logo */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6 md:mb-8"
              >
                <img
                  src="/ami-fincas/favAMI.png"
                  alt="AMI Fincas Logo"
                  className="h-16 sm:h-20 md:h-28 w-auto object-contain brightness-110 drop-shadow-2xl"
                />
              </motion.div>

              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mb-5 md:mb-8"
              >
                <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full">
                  <StarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
                  <span className="text-white/90 font-semibold text-[11px] sm:text-xs uppercase tracking-widest">{t('ami.hero.certified')}</span>
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-[2.5rem] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-5 md:mb-8 text-white"
              >
                {t('ami.hero.title1')} <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A2D18D] via-emerald-400 to-[#2D8A9D]">{t('ami.hero.title2')}</span> <br />
                {t('ami.hero.title3')}
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.7 }}
                className="text-base sm:text-lg md:text-xl text-white/70 mb-8 md:mb-12 max-w-2xl leading-relaxed font-medium"
              >
                {t('ami.hero.description')}
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 sm:gap-5 mb-12 md:mb-0"
              >
                <motion.a
                  href="#contacto"
                  whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(16,185,129,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  className="px-7 py-4 sm:px-10 sm:py-5 rounded-2xl bg-gradient-to-r from-[#A2D18D] to-[#2D8A9D] text-white font-black text-base sm:text-lg shadow-2xl shadow-emerald-500/20 transition-all duration-300 text-center"
                >
                  {t('ami.hero.cta.contact')}
                </motion.a>
                <motion.a
                  href="#servicios"
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                  className="px-7 py-4 sm:px-10 sm:py-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-base sm:text-lg hover:shadow-xl transition-all duration-300 text-center"
                >
                  {t('ami.hero.cta.services')}
                </motion.a>
              </motion.div>
            </div>
          </div>

          {/* Bottom Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="relative z-10 mt-auto"
          >
            <div className="bg-black/30 backdrop-blur-xl border-t border-white/10">
              <div className="container mx-auto px-5 sm:px-6 lg:px-8 py-5 md:py-6">
                <div className="flex flex-row justify-around items-center gap-4 md:gap-12">
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-xl sm:text-2xl md:text-3xl font-black text-white">+10</span>
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/60 leading-tight">
                      {t('ami.stats.years').split(' ').slice(0, 2).join(' ')}<br className="hidden sm:block" />{' '}{t('ami.stats.years').split(' ').slice(2).join(' ')}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/15 hidden sm:block" />
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-xl sm:text-2xl md:text-3xl font-black text-white">2</span>
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/60 leading-tight">
                      {t('ami.stats.offices').split(' ').slice(0, 1).join(' ')}<br className="hidden sm:block" />{' '}{t('ami.stats.offices').split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-white/15 hidden sm:block" />
                  <div className="flex items-center space-x-2 md:space-x-3">
                    <span className="text-xl sm:text-2xl md:text-3xl font-black text-white">100%</span>
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest text-white/60 leading-tight">
                      {t('ami.stats.digital').split(' ').slice(0, 1).join(' ')}<br className="hidden sm:block" />{' '}{t('ami.stats.digital').split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Services Section with Gears Image */}
        <section id="servicios" className="py-32 relative">
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[100px]" />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              {/* Left: Gears 3D Image */}
              <div className="lg:w-1/2 order-2 lg:order-1">
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-teal-500/10 rounded-[3rem] blur-3xl" />
                  <img
                    src="/ami-fincas/3d_gears.jpg"
                    alt="3D Property Mechanics"
                    className="w-full h-auto rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/5"
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {services.map((service, index) => (
                    <motion.div
                      key={service.title}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 rounded-[2rem] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10 hover:border-emerald-500/30 shadow-sm dark:shadow-none transition-all group"
                    >
                      <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-[#A2D18D] to-[#2D8A9D] flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                        <service.icon className="w-6 h-6" />
                      </div>
                      <h4 className="text-lg font-bold mb-2">{service.title}</h4>
                      <p className="text-slate-600 dark:text-slate-500 text-sm leading-relaxed">{service.description}</p>
                    </motion.div>
                  ))}
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

              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                >
                  <img
                    src="/ami-fincas/3d_circular.jpg"
                    alt="Success Growth 3D"
                    className="w-full max-w-[500px] mx-auto drop-shadow-[0_40px_40px_rgba(16,185,129,0.2)] rounded-[3rem]"
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
                  <div className="h-64 md:h-80 relative overflow-hidden">
                    <iframe
                      src={office.mapUrl}
                      className="w-full h-full border-0 absolute grayscale dark:invert filter opacity-50 contrast-125 group-hover:opacity-80 group-hover:grayscale-0 dark:group-hover:invert-0 transition-all duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0a0f1c] via-transparent to-transparent" />
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

            {/* Enhanced Large CTA - Immersive Design */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-32 relative group"
            >
              {/* Massive background glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 rounded-[4rem] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000" />

              <div className="relative p-12 md:p-24 rounded-[4rem] bg-white dark:bg-[#111827]/80 border border-slate-200 dark:border-white/10 backdrop-blur-3xl overflow-hidden text-center shadow-[0_0_100px_rgba(16,185,129,0.05)] dark:shadow-[0_0_100px_rgba(16,185,129,0.1)]">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" className="text-slate-200 dark:text-white" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100" height="100" fill="url(#grid)" />
                  </svg>
                </div>

                <motion.h3
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="text-5xl md:text-8xl font-black mb-12 leading-tight bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-white/40"
                >
                  {t('ami.cta.title').split(' ').map((word: string, i: number) => (
                    <span key={i}>{word}{i === 2 ? <br /> : ' '}</span>
                  ))}
                </motion.h3>

                <div className="flex flex-col md:flex-row gap-8 justify-center items-center mb-16">
                  <motion.a
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    href="mailto:info@amifincas.es"
                    className="px-14 py-7 rounded-[2rem] bg-emerald-500 dark:bg-white text-white dark:text-black font-black text-2xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] dark:shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:shadow-[0_25px_60px_rgba(16,185,129,0.4)] dark:hover:shadow-[0_25px_60px_rgba(255,255,255,0.3)] transition-all flex items-center space-x-3"
                  >
                    <span>{t('ami.cta.button')}</span>
                  </motion.a>

                  <motion.div
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                    className="px-10 py-6 rounded-[2rem] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center gap-4 transition-all"
                  >
                    <div className="flex flex-col items-center md:items-start">
                      <span className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-1">{t('ami.cta.sub')}</span>
                      <div className="flex flex-wrap justify-center md:justify-start gap-x-6">
                        <a href="tel:+34676626933" className="text-xl font-black text-slate-900 dark:text-white hover:text-emerald-500 transition-all font-mono">676 62 69 33</a>
                        <a href="tel:+34968179180" className="text-xl font-black text-slate-900 dark:text-white hover:text-emerald-500 transition-all font-mono">968 17 91 80</a>
                        <a href="tel:+34609008864" className="text-xl font-black text-slate-900 dark:text-white hover:text-emerald-500 transition-all font-mono">609 00 88 64</a>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Central 3D Asset with specialized animation */}
                <div className="mt-12 flex justify-center relative">
                  <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full scale-75" />
                  <motion.img
                    animate={{
                      y: [0, -30, 0],
                      rotate: [0, 1, 0, -1, 0],
                      scale: [1, 1.02, 1]
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    src="/ami-fincas/3d_islands.jpg"
                    alt="Ami Network"
                    className="h-48 md:h-80 object-contain relative z-10 drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)] rounded-[3rem]"
                  />
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
