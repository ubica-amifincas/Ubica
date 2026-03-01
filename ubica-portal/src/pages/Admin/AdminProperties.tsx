import React from 'react';

const AdminProperties: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Propiedades</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administrar todas las propiedades de la plataforma
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Gestión de propiedades en desarrollo...
        </p>
      </div>
    </div>
  );
};

export default AdminProperties;
