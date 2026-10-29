import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/apiService';
import AuthCard, { AuthAlert, authButtonClass, authInputClass, authLabelClass } from '../components/auth/AuthCard';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Introduce una dirección de correo válida.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.forgotPassword(email.trim());
      setSentMessage(
        res?.message ||
          'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva."
    >
      {sentMessage ? (
        <div className="space-y-6">
          <AuthAlert type="success">{sentMessage}</AuthAlert>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Revisa también la carpeta de correo no deseado. El enlace caduca pasado un tiempo.
          </p>
          <Link to="/login" className={`${authButtonClass} flex items-center justify-center`}>
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {error && <AuthAlert type="error">{error}</AuthAlert>}
          <div>
            <label htmlFor="forgot-email" className={authLabelClass}>Correo electrónico</label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="nombre@ejemplo.com"
            />
          </div>
          <button type="submit" disabled={loading} className={authButtonClass}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
};

export default ForgotPassword;
