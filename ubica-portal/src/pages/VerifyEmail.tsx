import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import { motion } from 'framer-motion';
import { useLanguage } from '../hooks/useLanguage';

const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const { t } = useLanguage();

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(t('auth.invalid_token'));
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await apiService.verifyEmail(token);
                setStatus('success');
                setMessage(response.message || t('auth.verify_success_msg'));
            } catch (error: any) {
                setStatus('error');
                setMessage(error.message || t('auth.verify_error_msg'));
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4a9d78] via-[#45b894] to-[#3d9e8f] py-12 px-4 sm:px-6 lg:px-8" style={{ perspective: '1000px' }}>
            <motion.div
                initial={{ opacity: 0, rotateY: -90, scale: 0.9 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 text-center space-y-6"
            >
                {status === 'loading' && (
                    <>
                        <div className="mx-auto flex justify-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#4a9d78]"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.verifying')}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{t('auth.verifying_msg')}</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mx-auto flex justify-center">
                            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.verify_success_title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{message}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full mt-6 py-3 px-4 rounded-lg text-white bg-[#4a9d78] hover:bg-[#3a8d68] font-medium transition-colors shadow-md hover:shadow-lg"
                        >
                            {t('auth.go_to_login')}
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mx-auto flex justify-center">
                            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth.verify_error_title')}</h2>
                        <p className="text-gray-600 dark:text-gray-400">{message}</p>
                        <div className="flex flex-col space-y-3 mt-6">
                            <Link to="/register" className="w-full py-3 px-4 rounded-lg text-white bg-gray-600 hover:bg-gray-700 font-medium transition-colors shadow-md hover:shadow-lg">
                                {t('auth.back_to_register')}
                            </Link>
                            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                                {t('auth.back_to_home')}
                            </Link>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyEmail;
