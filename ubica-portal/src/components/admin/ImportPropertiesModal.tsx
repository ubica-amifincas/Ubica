import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, DocumentArrowUpIcon, CheckCircleIcon, ExclamationTriangleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import appService from '../../services';
import { buttonClass } from '../dashboard/ui';

interface ImportPropertiesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportResult {
    ok: boolean;
    message: string;
    added?: number;
    errors?: number;
    details?: string[];
}

const MAX_BYTES = 10 * 1024 * 1024;

// Columnas que entiende el importador (también acepta los nombres en inglés: title, price, type…)
const TEMPLATE_HEADER = ['titulo', 'precio', 'tipo', 'estado', 'habitaciones', 'baños', 'superficie', 'municipio', 'direccion', 'descripcion', 'latitud', 'longitud', 'fotos'];
const TEMPLATE_ROW = ['Piso reformado en el centro', '185.000', 'piso', 'en venta', '3', '2', '95', 'Murcia', 'Calle Mayor 12', 'Luminoso y con terraza', '37.9838', '-1.1280', 'https://ejemplo.com/foto1.jpg|https://ejemplo.com/foto2.jpg'];

function downloadTemplate() {
    // Punto y coma y BOM: Excel en español lo abre en columnas y con tildes
    const csv = '﻿' + [TEMPLATE_HEADER, TEMPLATE_ROW].map(r => r.join(';')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-inmuebles-ubica.csv';
    a.click();
    URL.revokeObjectURL(url);
}

export function ImportPropertiesModal({ isOpen, onClose, onSuccess }: ImportPropertiesModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();

    const pickFile = (candidate?: File) => {
        if (!candidate) return;
        const name = candidate.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.json')) {
            setFile(null);
            setResult({ ok: false, message: 'Sube un archivo CSV o JSON.' });
        } else if (candidate.size > MAX_BYTES) {
            setFile(null);
            setResult({ ok: false, message: 'El archivo ocupa más de 10 MB.' });
        } else {
            setFile(candidate);
            setResult(null);
        }
    };

    const handleClose = useCallback(() => {
        if (isUploading) return;
        setFile(null);
        setResult(null);
        onClose();
    }, [isUploading, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, handleClose]);

    const handleImport = async () => {
        if (!file) return;
        setIsUploading(true);
        setResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await appService.importProperties(formData);
            const added = response.properties_added ?? 0;
            setResult({
                ok: added > 0,
                message: added > 0
                    ? `${added === 1 ? 'Se ha importado 1 inmueble' : `Se han importado ${added} inmuebles`}.`
                    : 'No se ha importado ningún inmueble.',
                added,
                errors: response.errors,
                details: response.error_details,
            });
            // La lista de detrás se actualiza ya; el resumen se queda abierto para leerlo
            if (added > 0) onSuccess();
            setFile(null);
        } catch (error) {
            setResult({ ok: false, message: error instanceof Error ? error.message : 'No se pudo importar el archivo.' });
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-gray-900/60 sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
            <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[92vh] w-full flex-col rounded-t-xl bg-white shadow-xl dark:bg-gray-800 sm:max-w-xl sm:rounded-xl">
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700 sm:px-6">
                    <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">Importar inmuebles</h2>
                    <button type="button" onClick={handleClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200" aria-label="Cerrar">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            Sube un <strong className="font-medium text-gray-900 dark:text-gray-200">CSV</strong> (separado por comas o por punto y coma)
                            o un <strong className="font-medium text-gray-900 dark:text-gray-200">JSON</strong> con una fila por inmueble.
                            Solo el precio es obligatorio; lo que falte queda vacío para completarlo después.
                        </p>
                        <p>
                            Las fotos se enlazan desde las URL de la columna <code className="rounded bg-gray-100 px-1 dark:bg-gray-900">fotos</code> (separadas por <code className="rounded bg-gray-100 px-1 dark:bg-gray-900">|</code>); no se copian a Ubica.
                        </p>
                        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-300">
                            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
                            Descargar plantilla CSV
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files[0]); }}
                        className={`flex w-full flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${isDragging || file
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'}`}
                    >
                        <DocumentArrowUpIcon className={`h-10 w-10 ${file ? 'text-emerald-600' : 'text-gray-400'}`} aria-hidden="true" />
                        {file ? (
                            <>
                                <span className="mt-2 max-w-full truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                                <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB · pulsa para cambiarlo</span>
                            </>
                        ) : (
                            <>
                                <span className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium text-emerald-700 dark:text-emerald-300">Elige un archivo</span> o arrástralo aquí
                                </span>
                                <span className="text-xs text-gray-500">CSV o JSON, hasta 10 MB</span>
                            </>
                        )}
                    </button>
                    <input ref={fileInputRef} type="file" className="sr-only" accept=".csv,.json,text/csv,application/json"
                        onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} aria-label="Archivo a importar" />

                    {result && (
                        <div role="status" className={`flex gap-3 rounded-lg p-4 text-sm ${result.ok
                            ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100'
                            : 'bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100'}`}>
                            {result.ok
                                ? <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden="true" />
                                : <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />}
                            <div className="min-w-0 flex-1">
                                <p className="font-medium">{result.message}</p>
                                {!!result.errors && result.errors > 0 && (
                                    <div className="mt-2">
                                        <p>{result.errors === 1 ? '1 fila no se ha podido importar:' : `${result.errors} filas no se han podido importar:`}</p>
                                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
                                            {result.details?.map((err, i) => <li key={i} className="break-words">{err}</li>)}
                                        </ul>
                                        {result.errors > (result.details?.length ?? 0) && (
                                            <p className="mt-1 text-xs">Se muestran las primeras {result.details?.length}.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 sm:flex-row sm:justify-end sm:px-6">
                    <button type="button" onClick={handleClose} disabled={isUploading} className={buttonClass.secondary}>
                        {result?.ok ? 'Cerrar' : 'Cancelar'}
                    </button>
                    <button type="button" onClick={handleImport} disabled={!file || isUploading} className={`${buttonClass.primary} sm:min-w-[8rem]`}>
                        {isUploading ? 'Importando…' : 'Importar'}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
