import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentTextIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: 'user_action' | 'system_event' | 'security_event' | 'error';
  user: string;
  action: string;
  details: string;
  ip_address: string;
  user_agent?: string;
}

const SystemLogsComponent: React.FC = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    user: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const generateMockLogs = (): LogEntry[] => {
    const users = ['admin@ubica.com', 'inmobiliaria1@ubica.com', 'inversor1@ubica.com', 'system'];
    const actions = [
      'User login',
      'User logout',
      'Property created',
      'Property updated',
      'Property deleted',
      'User created',
      'User updated',
      'Password changed',
      'Failed login attempt',
      'Session expired',
      'Settings updated',
      'Export generated',
      'Database backup',
      'System restart'
    ];

    const categories: LogEntry['category'][] = ['user_action', 'system_event', 'security_event', 'error'];
    const levels: LogEntry['level'][] = ['info', 'warning', 'error', 'success'];
    const ips = ['192.168.1.100', '10.0.0.15', '172.16.0.50', '203.0.113.42'];

    const mockLogs: LogEntry[] = [];

    for (let i = 0; i < 50; i++) {
      const date = new Date();
      date.setHours(date.getHours() - Math.floor(Math.random() * 168)); // Last week

      mockLogs.push({
        id: i + 1,
        timestamp: date.toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        user: users[Math.floor(Math.random() * users.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        details: `Operation completed successfully. Session ID: ${Math.random().toString(36).substring(7)}`,
        ip_address: ips[Math.floor(Math.random() * ips.length)],
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
    }

    return mockLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      // Load from localStorage or generate mock data
      const savedLogs = localStorage.getItem('ubica_system_logs');
      let logsData: LogEntry[];

      if (savedLogs) {
        logsData = JSON.parse(savedLogs);
      } else {
        logsData = generateMockLogs();
        localStorage.setItem('ubica_system_logs', JSON.stringify(logsData));
      }

      setLogs(logsData);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = logs;

    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters.user) {
      filtered = filtered.filter(log =>
        log.user.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.search) {
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.details.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log =>
        new Date(log.timestamp) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log =>
        new Date(log.timestamp) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    setFilteredLogs(filtered);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      level: '',
      category: '',
      user: '',
      dateFrom: '',
      dateTo: '',
      search: ''
    });
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ubica_logs_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      setLogs([]);
      setFilteredLogs([]);
      localStorage.removeItem('ubica_system_logs');
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      default:
        return <InformationCircleIcon className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (level) {
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'warning':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
      case 'success':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      default:
        return `${baseClasses} bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400`;
    }
  };

  const getCategoryBadge = (category: LogEntry['category']) => {
    const baseClasses = "inline-flex px-2 py-1 text-xs font-semibold rounded-full";
    switch (category) {
      case 'security_event':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400`;
      case 'error':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400`;
      case 'system_event':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('logs.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {t('logs.subtitle')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportLogs}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span>{t('logs.exportLogs')}</span>
          </button>
          <button
            onClick={clearLogs}
            className="inline-flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{t('logs.clearLogs')}</span>
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Logs</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{logs.length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <XCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Errors</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {logs.filter(log => log.level === 'error').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Warnings</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {logs.filter(log => log.level === 'warning').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <InformationCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Security Events</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {logs.filter(log => log.category === 'security_event').length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-3 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
            >
              <option value="">All Categories</option>
              <option value="user_action">User Actions</option>
              <option value="system_event">System Events</option>
              <option value="security_event">Security Events</option>
              <option value="error">Errors</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User
            </label>
            <input
              type="text"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
              placeholder="Filter by user..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search in actions and details..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Logs ({filteredLogs.length} entries)
            </h3>
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('logs.timestamp')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('logs.user')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('logs.action')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  {t('logs.ipAddress')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getLevelIcon(log.level)}
                      <span className={getLevelBadge(log.level)}>
                        {log.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getCategoryBadge(log.category)}>
                      {log.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.user}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    <div>
                      <div className="font-medium">{log.action}</div>
                      <div className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {log.details}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                    {log.ip_address}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No logs found matching your criteria
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SystemLogsComponent;
