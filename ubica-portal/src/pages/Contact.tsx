import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    MapPinIcon,
    PhoneIcon,
    EnvelopeIcon,
    ClockIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '../hooks/useLanguage';

export default function Contact() {
    const { t } = useLanguage();
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const contactInfo = [
        {
            icon: MapPinIcon,
            title: t('contact.address'),
            content: 'C. Ángeles, 41, 30007 Murcia',
            link: 'https://goo.gl/maps/...'
        },
        {
            icon: PhoneIcon,
            title: t('contact.phone'),
            content: '+34 676 62 69 33',
            link: 'tel:+34676626933'
        },
        {
            icon: EnvelopeIcon,
            title: t('contact.email'),
            content: 'info@amifincas.es',
            link: 'mailto:info@amifincas.es'
        },
        {
            icon: ClockIcon,
            title: t('contact.hours'),
            content: 'Lun - Vie: 9:30 - 14:00',
            subContent: t('contact.sat_hours')
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormStatus('submitting');
        // Simular envío
        setTimeout(() => setFormStatus('success'), 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6"
                    >
                        {t('contact.title')}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-600 dark:text-gray-400"
                    >
                        {t('contact.subtitle')}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('contact.info_title')}</h2>
                        {contactInfo.map((info, i) => (
                            <motion.div
                                key={info.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-start gap-4"
                            >
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <info.icon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{info.title}</h3>
                                    {info.link ? (
                                        <a href={info.link} className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 transition-colors">
                                            {info.content}
                                        </a>
                                    ) : (
                                        <p className="text-gray-600 dark:text-gray-400">{info.content}</p>
                                    )}
                                    {info.subContent && (
                                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{info.subContent}</p>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Map Preview */}
                        <div className="mt-12 rounded-3xl overflow-hidden h-64 shadow-lg border border-gray-200 dark:border-gray-700">
                            <iframe
                                title={t('contact.map_title')}
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3144.381335759714!2d-1.101783423455648!3d37.99166667193155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd6382024b33b28b%3A0x64c8d56b05786ed0!2sC.%20%C3%81ngeles%2C%2041%2C%2030007%20Murcia!5e0!3m2!1ses!2ses!4v1708980000000!5m2!1ses!2ses"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            />
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('contact.form.title')}</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.name')}
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder={t('contact.form.name_placeholder')}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.email')}
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder={t('contact.form.email_placeholder')}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.phone')}
                                        </label>
                                        <input
                                            type="tel"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                            placeholder="+34 000 000 000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.subject')}
                                        </label>
                                        <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all">
                                            <option value="">{t('contact.form.subject_placeholder')}</option>
                                            <option value="buy">{t('contact.form.subj_buy')}</option>
                                            <option value="sell">{t('contact.form.subj_sell')}</option>
                                            <option value="rent">{t('contact.form.subj_rent')}</option>
                                            <option value="invest">{t('contact.form.subj_invest')}</option>
                                            <option value="admin">{t('contact.form.subj_admin')}</option>
                                            <option value="other">{t('contact.form.subj_other')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('contact.form.message')}
                                    </label>
                                    <textarea
                                        rows={4}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        placeholder={t('contact.form.message_placeholder')}
                                    ></textarea>
                                </div>
                                <button
                                    type="submit"
                                    disabled={formStatus === 'submitting'}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    {formStatus === 'submitting' ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {t('contact.form.submit')}
                                            <PaperAirplaneIcon className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                {formStatus === 'success' && (
                                    <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-emerald-600 dark:text-emerald-400 text-center font-medium"
                                    >
                                        {t('contact.form.success')}
                                    </motion.p>
                                )}
                            </form>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
