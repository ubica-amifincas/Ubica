import { motion } from 'framer-motion';
import { useLanguage } from '../../hooks/useLanguage';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  overlay?: boolean;
  color?: 'blue' | 'gray' | 'white';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const colorClasses = {
  blue: 'text-blue-600',
  gray: 'text-gray-600',
  white: 'text-white'
};

export function LoadingSpinner({ 
  size = 'md', 
  text, 
  overlay = false, 
  color = 'blue' 
}: LoadingSpinnerProps) {
  const { t } = useLanguage();
  
  const spinner = (
    <motion.div
      className="flex items-center justify-center space-x-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`${sizeClasses[size]} ${colorClasses[color]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <svg
          className="w-full h-full"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </motion.div>
      {text && (
        <motion.span
          className={`text-sm font-medium ${colorClasses[color]}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.span>
      )}
    </motion.div>
  );

  if (overlay) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          {spinner}
        </motion.div>
      </motion.div>
    );
  }

  return spinner;
}

export function PageLoader() {
  const { t } = useLanguage();
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="xl" text={t('common.loading')} />
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  const { t } = useLanguage();
  
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="lg" text={text || t('common.loading')} />
    </div>
  );
}

export function ButtonLoader() {
  return (
    <LoadingSpinner size="sm" color="white" />
  );
}

// Skeleton loaders for better UX
export function PropertyCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="aspect-video w-full rounded-md bg-gray-200 dark:bg-gray-700"></div>
      <div className="mt-4 space-y-3">
        <div className="h-4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        <div className="flex justify-between">
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex space-x-4">
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      ))}
    </div>
  );
}

// Export default para compatibilidad
export default LoadingSpinner;
