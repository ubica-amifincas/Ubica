import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useLanguage } from './useLanguage';
import { useNavigate } from 'react-router-dom';

export const useAuthNotifications = () => {
  const auth = useAuth();
  const notifications = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const loginWithNotification = async (email: string, password: string) => {
    try {
      await auth.login(email, password);
      notifications.success(
        t('auth.loginSuccess'),
        `¡Bienvenido de vuelta, ${auth.user?.full_name || email}!`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Por favor, verifica tus credenciales e intenta nuevamente.';
      const title = errorMessage.includes('verifica tu correo')
        ? 'Verificación Requerida'
        : t('auth.invalidCredentials');

      notifications.error(
        title,
        errorMessage
      );
      throw error;
    }
  };

  const logoutWithNotification = () => {
    const userName = auth.user?.full_name || auth.user?.email;
    auth.logout();
    notifications.success(
      t('auth.logoutSuccess'),
      `¡Hasta pronto, ${userName}!`
    );
    navigate('/');
  };

  const registerWithNotification = async (userData: any) => {
    try {
      await auth.register(userData);
      notifications.success(
        'Registro exitoso',
        '¡Tu cuenta ha sido creada correctamente!'
      );
    } catch (error) {
      notifications.error(
        'Error en el registro',
        'No se pudo crear la cuenta. Intenta nuevamente.'
      );
      throw error;
    }
  };

  return {
    ...auth,
    loginWithNotification,
    logoutWithNotification,
    registerWithNotification,
    notifications
  };
};
