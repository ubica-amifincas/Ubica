import React from 'react';

const RealtorDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Inmobiliaria</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Panel de control para inmobiliarias
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Propiedades</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">--</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ventas</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">--</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Alquileres</h3>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">--</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Comisiones</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">--</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Dashboard inmobiliaria en desarrollo...
        </p>
      </div>
    </div>
  );
};

export default RealtorDashboard;
