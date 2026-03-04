import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    BuildingOffice2Icon,
    ChartBarIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    SparklesIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '../hooks/useLanguage';

export default function About() {
    const { t } = useLanguage();

    const values = [
        { icon: ShieldCheckIcon, title: t('about.values.confidence.title'), desc: t('about.values.confidence.desc') },
        { icon: ChartBarIcon, title: t('about.values.innovation.title'), desc: t('about.values.innovation.desc') },
        { icon: UserGroupIcon, title: t('about.values.proximity.title'), desc: t('about.values.proximity.desc') },
        { icon: GlobeAltIcon, title: t('about.values.reach.title'), desc: t('about.values.reach.desc') },
    ];

    const stats = [
        { value: '500+', label: t('about.stats.managed') },
        { value: '20+', label: t('about.stats.years') },
        { value: '98%', label: t('about.stats.clients') },
        { value: '50+', label: t('about.stats.pros') },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 py-20"
            >
                <div className="container mx-auto px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
                    >
                        <SparklesIcon className="h-5 w-5 text-white" />
                        <span className="text-white text-sm font-medium">{t('about.hero.since')}</span>
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6"
                    >
                        {t('about.hero.title')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-xl text-white/90 max-w-3xl mx-auto"
                    >
                        {t('about.hero.description')}
                    </motion.p>
                </div>
            </motion.div>

            {/* Stats */}
            <div className="container mx-auto px-4 -mt-10 relative z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center border border-gray-100 dark:border-gray-700"
                        >
                            <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                                {stat.value}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Mission */}
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-lg border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-xl">
                                <BuildingOffice2Icon className="h-6 w-6 text-white" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">El Propósito de Ubica</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-4">
                            <strong>Ubica</strong> es un producto exclusivo y creado por <strong>AMI Fincas</strong>, con la ambiciosa finalidad de mejorar significativamente la claridad digital en el mercado de la vivienda.
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                            Nuestra plataforma ofrece una digitalización clara e intuitiva para todos nuestros clientes, unificando herramientas tanto a nivel de <strong>inmobiliaria</strong> como de <strong>inversionista</strong>, para brindar agilidad, transparencia y precisión en cada paso de tus operaciones.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Values */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 py-16">
                <div className="container mx-auto px-4">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12"
                    >
                        {t('about.values.title')}
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                        {values.map((val, i) => (
                            <motion.div
                                key={val.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.7 + i * 0.1 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
                            >
                                <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
                                    <val.icon className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{val.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400">{val.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="container mx-auto px-4 py-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 rounded-3xl p-8 md:p-12 text-center shadow-2xl"
                >
                    <h2 className="text-3xl font-bold text-white mb-4">{t('about.cta.title')}</h2>
                    <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                        {t('about.cta.desc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/contact"
                            className="bg-white text-emerald-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            {t('about.cta.contact')}
                        </Link>
                        <Link
                            to="/ami-fincas"
                            className="bg-white/10 text-white border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white/20 transition-colors"
                        >
                            {t('about.cta.ami')}
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
