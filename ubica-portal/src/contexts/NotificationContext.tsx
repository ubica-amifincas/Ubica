import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove notification
    if (!notification.persistent && newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'success', title, message, duration });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'error', title, message, duration: duration ?? 7000 });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'warning', title, message, duration });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    addNotification({ type: 'info', title, message, duration });
  }, [addNotification]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-400" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'info':
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  const getColorClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const getTitleColorClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-300';
      case 'error':
        return 'text-red-800 dark:text-red-300';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-300';
      case 'info':
        return 'text-blue-800 dark:text-blue-300';
      default:
        return 'text-gray-800 dark:text-gray-300';
    }
  };

  const getMessageColorClasses = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'error':
        return 'text-red-700 dark:text-red-400';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400';
      case 'info':
        return 'text-blue-700 dark:text-blue-400';
      default:
        return 'text-gray-700 dark:text-gray-400';
    }
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        addNotification, 
        removeNotification, 
        success, 
        error, 
        warning, 
        info 
      }}
    >
      {children}
      
      {/* Notification Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`
                relative rounded-lg border p-4 shadow-lg backdrop-blur-sm
                ${getColorClasses(notification.type)}
              `}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getIcon(notification.type)}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${getTitleColorClasses(notification.type)}`}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className={`mt-1 text-sm ${getMessageColorClasses(notification.type)}`}>
                      {notification.message}
                    </p>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className={`
                      inline-flex rounded-md p-1.5 transition-colors
                      ${notification.type === 'success' ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-800/30' : ''}
                      ${notification.type === 'error' ? 'text-red-500 hover:bg-red-100 dark:hover:bg-red-800/30' : ''}
                      ${notification.type === 'warning' ? 'text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-800/30' : ''}
                      ${notification.type === 'info' ? 'text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800/30' : ''}
                    `}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
