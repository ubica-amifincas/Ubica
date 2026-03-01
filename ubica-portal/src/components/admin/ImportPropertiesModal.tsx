import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, DocumentArrowUpIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import appService from '../../services';

interface ImportPropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportPropertiesModal({ isOpen, onClose, onSuccess }: ImportPropertiesModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; properties_added?: number; errors?: number; details?: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.json') || droppedFile.name.endsWith('.xlsx'))) {
            setFile(droppedFile);
            setResult(null);
        } else {
            setResult({ success: false, message: 'Por favor, sube un archivo CSV o JSON válido.' });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsUploading(true);
        setResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await appService.importProperties(formData);
            setResult({
                success: true,
                message: response.message,
                properties_added: response.properties_added,
                errors: response.errors,
                details: response.error_details
            });
            if (response.properties_added && response.properties_added > 0) {
                setTimeout(() => {
                    onSuccess();
                    handleClose();
                }, 3000);
            }
        } catch (error: any) {
            setResult({
                success: false,
                message: error.response?.data?.detail || 'Error de conexión al importar el archivo.'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="inline-block transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-bottom shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:align-middle border border-gray-100 dark:border-gray-700"
                    >
                        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Importar Inmuebles
                                </h3>
                                <button
                                    onClick={handleClose}
                                    className="rounded-full p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Sube un archivo <strong className="text-gray-900 dark:text-gray-200">CSV o JSON</strong> descargado desde portales inmobiliarios usando extensiones de scraping. El sistema importará las propiedades y descargará automáticamente sus fotos principales.
                            </p>

                            {/* Upload Area */}
                            <div
                                className={`flex justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${file ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10' : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center cursor-pointer">
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-emerald-500" />
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {file.name}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                <span className="relative rounded-md font-semibold text-emerald-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 hover:text-emerald-500">
                                                    Sube un archivo
                                                </span>
                                                <p className="pl-1">o arrástralo y suéltalo aquí</p>
                                            </div>
                                            <p className="text-xs leading-5 text-gray-500">CSV, JSON hasta 10MB</p>
                                        </>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="sr-only"
                                        accept=".csv, application/json, .json"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            {/* Status Message */}
                            {result && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mt-6 p-4 rounded-xl flex items-start space-x-3 ${result.success ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                                        }`}
                                >
                                    {result.success ? (
                                        <CheckCircleIcon className="h-6 w-6 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <ExclamationCircleIcon className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 w-full overflow-hidden">
                                        <h4 className="font-medium">{result.message}</h4>
                                        {result.properties_added !== undefined && (
                                            <p className="text-sm mt-1">Propiedades añadidas: {result.properties_added}</p>
                                        )}
                                        {result.errors !== undefined && result.errors > 0 && (
                                            <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30 p-3 rounded-lg">
                                                <p className="font-medium mb-1">Hubo {result.errors} errores:</p>
                                                <ul className="list-disc pl-5 mt-1 text-xs opacity-90 space-y-1">
                                                    {result.details?.map((err, i) => (
                                                        <li key={i} className="truncate">{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800/80 px-4 py-4 sm:flex sm:flex-row-reverse sm:px-6">
                            <button
                                type="button"
                                disabled={!file || isUploading}
                                onClick={handleImport}
                                className="inline-flex w-full min-w-[140px] justify-center items-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_0_rgba(16,185,129,0.39)] hover:bg-emerald-500 disabled:opacity-50 disabled:shadow-none sm:ml-3 sm:w-auto transition-all"
                            >
                                {isUploading ? (
                                    <>
                                        <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                                        Procesando...
                                    </>
                                ) : (
                                    'Importar'
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isUploading}
                                className="mt-3 inline-flex w-full justify-center items-center rounded-xl bg-white dark:bg-gray-700 px-6 py-3 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}
