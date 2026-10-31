import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    MapPinIcon,
    PhoneIcon,
    EnvelopeIcon,
    ClockIcon,
    PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import ConsentMap from '../components/common/ConsentMap';
import apiService from '../services/apiService';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;

type ContactField = 'name' | 'email' | 'phone' | 'subject' | 'message';
type ContactForm = Record<ContactField, string>;
type ContactErrors = Partial<Record<ContactField, string>>;

const EMPTY_FORM: ContactForm = { name: '', email: '', phone: '', subject: '', message: '' };

function validate(form: ContactForm): ContactErrors {
    const errors: ContactErrors = {};
    if (!form.name.trim()) errors.name = 'Indica tu nombre.';
    else if (form.name.trim().length > 200) errors.name = 'El nombre no puede superar 200 caracteres.';
    if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Introduce un correo electrónico válido.';
    if (form.phone.trim() && !/^[+\d\s().-]{6,50}$/.test(form.phone.trim())) errors.phone = 'Introduce un teléfono válido.';
    const msg = form.message.trim();
    if (msg.length < MESSAGE_MIN) errors.message = `El mensaje debe tener al menos ${MESSAGE_MIN} caracteres.`;
    else if (msg.length > MESSAGE_MAX) errors.message = `El mensaje no puede superar ${MESSAGE_MAX} caracteres.`;
    return errors;
}

const FieldError = ({ field, errors }: { field: ContactField; errors: ContactErrors }) =>
    errors[field] ? <p id={`contact-${field}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">{errors[field]}</p> : null;

export default function Contact() {
    const { t } = useLanguage();
    const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<ContactErrors>({});
    const [serverMessage, setServerMessage] = useState('');

    const subjectOptions = [
        { value: 'buy', label: t('contact.form.subj_buy') },
        { value: 'sell', label: t('contact.form.subj_sell') },
        { value: 'rent', label: t('contact.form.subj_rent') },
        { value: 'invest', label: t('contact.form.subj_invest') },
        { value: 'admin', label: t('contact.form.subj_admin') },
        { value: 'other', label: t('contact.form.subj_other') },
    ];

    const setField = (field: ContactField) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
        if (formStatus === 'success' || formStatus === 'error') setFormStatus('idle');
    };

    const inputClass = (field: ContactField) =>
        `w-full px-4 py-3 rounded-xl border ${errors[field] ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-600'} bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`;

    const contactInfo = [
        {
            icon: MapPinIcon,
            title: t('contact.address'),
            content: 'C. Ángeles, 41, 30007 Murcia',
            link: 'https://www.google.com/maps/search/?api=1&query=C.+%C3%81ngeles+41+30007+Murcia'
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
            content: t('footer.hours')
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validation = validate(form);
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        setFormStatus('submitting');
        setServerMessage('');
        try {
            const subjectLabel = subjectOptions.find(o => o.value === form.subject)?.label;
            const res = await apiService.sendContact({
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                subject: subjectLabel || undefined,
                message: form.message.trim(),
            });
            setServerMessage(res?.message || t('contact.form.success'));
            setFormStatus('success');
            setForm(EMPTY_FORM);
        } catch (err) {
            setServerMessage(err instanceof Error ? err.message : 'No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.');
            setFormStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
            <div className="page-container">
                {/* Header */}
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <motion.h1
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6"
                    >
                        {t('contact.title')}
                    </motion.h1>
                    <motion.p
                        initial={false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl text-gray-600 dark:text-gray-400"
                    >
                        {t('contact.subtitle')}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('contact.info_title')}</h2>
                        {contactInfo.map((info, i) => (
                            <motion.div
                                key={info.title}
                                initial={false}
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
                                </div>
                            </motion.div>
                        ))}

                        {/* Map Preview */}
                        <div className="mt-12 rounded-3xl overflow-hidden h-64 shadow-lg border border-gray-200 dark:border-gray-700">
                            <ConsentMap
                                title={t('contact.map_title')}
                                address="C. Ángeles, 41, 30007 Murcia"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3144.381335759714!2d-1.101783423455648!3d37.99166667193155!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd6382024b33b28b%3A0x64c8d56b05786ed0!2sC.%20%C3%81ngeles%2C%2041%2C%2030007%20Murcia!5e0!3m2!1ses!2ses!4v1708980000000!5m2!1ses!2ses"
                            />
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={false}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white dark:bg-gray-800 rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 dark:border-gray-700"
                        >
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">{t('contact.form.title')}</h2>
                            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.name')} <span aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="contact-name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            maxLength={200}
                                            value={form.name}
                                            onChange={setField('name')}
                                            aria-invalid={!!errors.name}
                                            aria-describedby={errors.name ? 'contact-name-error' : undefined}
                                            className={inputClass('name')}
                                            placeholder={t('contact.form.name_placeholder')}
                                        />
                                        <FieldError field="name" errors={errors} />
                                    </div>
                                    <div>
                                        <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.email')} <span aria-hidden="true">*</span>
                                        </label>
                                        <input
                                            id="contact-email"
                                            type="email"
                                            required
                                            autoComplete="email"
                                            value={form.email}
                                            onChange={setField('email')}
                                            aria-invalid={!!errors.email}
                                            aria-describedby={errors.email ? 'contact-email-error' : undefined}
                                            className={inputClass('email')}
                                            placeholder={t('contact.form.email_placeholder')}
                                        />
                                        <FieldError field="email" errors={errors} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.phone')}
                                        </label>
                                        <input
                                            id="contact-phone"
                                            type="tel"
                                            autoComplete="tel"
                                            maxLength={50}
                                            value={form.phone}
                                            onChange={setField('phone')}
                                            aria-invalid={!!errors.phone}
                                            aria-describedby={errors.phone ? 'contact-phone-error' : undefined}
                                            className={inputClass('phone')}
                                            placeholder="+34 000 000 000"
                                        />
                                        <FieldError field="phone" errors={errors} />
                                    </div>
                                    <div>
                                        <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            {t('contact.form.subject')}
                                        </label>
                                        <select
                                            id="contact-subject"
                                            value={form.subject}
                                            onChange={setField('subject')}
                                            className={inputClass('subject')}
                                        >
                                            <option value="">{t('contact.form.subject_placeholder')}</option>
                                            {subjectOptions.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('contact.form.message')} <span aria-hidden="true">*</span>
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        rows={4}
                                        required
                                        maxLength={MESSAGE_MAX}
                                        value={form.message}
                                        onChange={setField('message')}
                                        aria-invalid={!!errors.message}
                                        aria-describedby={errors.message ? 'contact-message-error' : undefined}
                                        className={inputClass('message')}
                                        placeholder={t('contact.form.message_placeholder')}
                                    ></textarea>
                                    <div className="flex justify-between gap-4">
                                        <FieldError field="message" errors={errors} />
                                        <span className="mt-1 ml-auto text-xs text-gray-400">{form.message.trim().length}/{MESSAGE_MAX}</span>
                                    </div>
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
                                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-gray-700 dark:text-gray-300">
                                    <p className="font-semibold text-gray-900 dark:text-white">Protección de datos personales</p>
                                    <p className="mt-1">
                                        Utilizaremos sus datos para responder consultas y realizar análisis estadísticos. Para más información sobre el
                                        tratamiento y sus derechos, consulte la{' '}
                                        <Link to="/privacy" className="font-medium text-emerald-700 dark:text-emerald-400 underline">política de privacidad</Link>
                                    </p>
                                </div>
                                {formStatus === 'success' && (
                                    <motion.p
                                        role="status"
                                        initial={false}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-emerald-600 dark:text-emerald-400 text-center font-medium"
                                    >
                                        {serverMessage}
                                    </motion.p>
                                )}
                                {formStatus === 'error' && (
                                    <motion.p
                                        role="alert"
                                        initial={false}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-red-600 dark:text-red-400 text-center font-medium"
                                    >
                                        {serverMessage}
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
