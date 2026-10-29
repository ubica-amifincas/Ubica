import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import apiService from '../services/apiService';
import AuthCard, { AuthAlert, ResultIcon, authButtonClass, authInputClass, authLabelClass } from '../components/auth/AuthCard';

const MIN_LENGTH = 8;

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doneMessage, setDoneMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.resetPassword(token, password);
      setDoneMessage(res?.message || 'Tu contraseña se ha actualizado. Ya puedes iniciar sesión.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Enlace no válido">
        <div className="space-y-6 text-center">
          <ResultIcon ok={false} />
          <p className="text-gray-600 dark:text-gray-400">
            El enlace para restablecer la contraseña no es válido o está incompleto. Solicita uno nuevo.
          </p>
          <Link to="/forgot-password" className={`${authButtonClass} flex items-center justify-center`}>
            Solicitar un enlace nuevo
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (doneMessage) {
    return (
      <AuthCard title="Contraseña actualizada">
        <div className="space-y-6 text-center">
          <ResultIcon ok />
          <p className="text-gray-600 dark:text-gray-400">{doneMessage}</p>
          <Link to="/login" className={`${authButtonClass} flex items-center justify-center`}>
            Iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Nueva contraseña" subtitle={`Elige una contraseña de al menos ${MIN_LENGTH} caracteres.`}>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {error && (
          <AuthAlert type="error">
            {error}{' '}
            <Link to="/forgot-password" className="font-bold underline">Solicitar otro enlace</Link>
          </AuthAlert>
        )}
        <div>
          <label htmlFor="reset-password" className={authLabelClass}>Nueva contraseña</label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="••••••••"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-emerald-500 transition-colors"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="reset-confirm" className={authLabelClass}>Repite la contraseña</label>
          <input
            id="reset-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className={authButtonClass}>
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthCard>
  );
};

export default ResetPassword;
