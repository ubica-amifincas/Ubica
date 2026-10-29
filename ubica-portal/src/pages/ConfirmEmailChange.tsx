import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
import AuthCard, { ResultIcon, authButtonClass } from '../components/auth/AuthCard';

const ConfirmEmailChange: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { isAuthenticated, updateUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'El enlace de confirmación no es válido o está incompleto.');
  const requested = useRef(false);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true; // el token es de un solo uso: evitar la doble llamada en modo estricto

    apiService.confirmEmailChange(token)
      .then(async res => {
        setStatus('success');
        setMessage(res?.message || 'Tu dirección de correo se ha actualizado.');
        // Si hay sesión abierta, refrescar los datos del usuario con el correo nuevo
        if (isAuthenticated) {
          try {
            const fresh = await apiService.getCurrentUser(true);
            updateUser({ email: fresh.email });
          } catch {
            /* no es crítico */
          }
        }
      })
      .catch(err => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'No se pudo confirmar el cambio de correo.');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthCard title={status === 'loading' ? 'Confirmando tu correo…' : status === 'success' ? 'Correo actualizado' : 'No se pudo confirmar'}>
      <div className="space-y-6 text-center">
        {status === 'loading' ? (
          <div className="mx-auto flex justify-center">
            <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <ResultIcon ok={status === 'success'} />
        )}
        {message && <p className="text-gray-600 dark:text-gray-400">{message}</p>}
        {status !== 'loading' && (
          <Link
            to={isAuthenticated ? '/dashboard/settings/email' : '/login'}
            className={`${authButtonClass} flex items-center justify-center`}
          >
            {isAuthenticated ? 'Ir a mi cuenta' : 'Iniciar sesión'}
          </Link>
        )}
      </div>
    </AuthCard>
  );
};

export default ConfirmEmailChange;
