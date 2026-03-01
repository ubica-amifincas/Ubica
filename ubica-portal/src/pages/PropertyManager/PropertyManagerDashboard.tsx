import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BuildingOffice2Icon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  ChartBarIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  CameraIcon,
  ArrowUpTrayIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  CalculatorIcon,
  PrinterIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  BeakerIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../hooks/useLanguage';

interface Community {
  id: string;
  name: string;
  address: string;
  units: number;
  totalArea: number;
  monthlyFee: number;
  reserves: number;
  president: string;
  administrator: string;
  status: 'active' | 'inactive' | 'pending';
  createdDate: string;
  nextMeeting: string;
  documents: Document[];
  expenses: Expense[];
  income: Income[];
}

interface Document {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'contract' | 'report' | 'meeting';
  date: string;
  amount?: number;
  supplier?: string;
  status: 'processed' | 'pending' | 'error';
  ocrExtracted?: {
    vendor: string;
    amount: number;
    date: string;
    concept: string;
    vatAmount: number;
    totalAmount: number;
  };
}

interface Expense {
  id: string;
  concept: string;
  amount: number;
  date: string;
  category: 'maintenance' | 'utilities' | 'insurance' | 'cleaning' | 'security' | 'admin' | 'repairs' | 'other';
  supplier: string;
  invoiceNumber?: string;
  vatAmount: number;
  documentId?: string;
}

interface Income {
  id: string;
  concept: string;
  amount: number;
  date: string;
  source: 'fees' | 'parking' | 'rentals' | 'other';
  unit?: string;
  owner?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  requestedBy: string;
  assignedTo?: string;
  createdDate: string;
  completedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  category: 'plumbing' | 'electrical' | 'hvac' | 'structural' | 'cleaning' | 'landscaping' | 'security' | 'other';
}

const MOCK_COMMUNITIES: Community[] = [
  {
    id: '1',
    name: 'Residencial Los Olivos',
    address: 'Calle Mayor 123, Murcia',
    units: 48,
    totalArea: 5200,
    monthlyFee: 85,
    reserves: 15000,
    president: 'María García López',
    administrator: 'Carlos Ruiz',
    status: 'active',
    createdDate: '2023-01-15',
    nextMeeting: '2024-07-15',
    documents: [],
    expenses: [],
    income: []
  },
  {
    id: '2',
    name: 'Urbanización Vista Bella',
    address: 'Avenida de la Libertad 456, Cartagena',
    units: 72,
    totalArea: 8400,
    monthlyFee: 95,
    reserves: 28000,
    president: 'Juan Pedro Martínez',
    administrator: 'Ana Sánchez',
    status: 'active',
    createdDate: '2022-08-20',
    nextMeeting: '2024-08-10',
    documents: [],
    expenses: [],
    income: []
  }
];

const MOCK_EXPENSES: Expense[] = [
  {
    id: '1',
    concept: 'Mantenimiento ascensor',
    amount: 450.00,
    date: '2024-06-01',
    category: 'maintenance',
    supplier: 'Ascensores Murcia S.L.',
    invoiceNumber: 'ASC-2024-0145',
    vatAmount: 94.50
  },
  {
    id: '2',
    concept: 'Limpieza zonas comunes',
    amount: 680.00,
    date: '2024-06-05',
    category: 'cleaning',
    supplier: 'Limpiezas Mediterráneo',
    vatAmount: 142.80
  },
  {
    id: '3',
    concept: 'Factura electricidad',
    amount: 234.50,
    date: '2024-06-08',
    category: 'utilities',
    supplier: 'Iberdrola',
    vatAmount: 49.25
  }
];

const MOCK_MAINTENANCE_REQUESTS: MaintenanceRequest[] = [
  {
    id: '1',
    title: 'Fuga de agua en el garaje',
    description: 'Se ha detectado una fuga de agua en la zona del garaje, nivel -1',
    priority: 'high',
    status: 'pending',
    requestedBy: 'Propietario 3A',
    createdDate: '2024-06-10',
    estimatedCost: 250,
    category: 'plumbing'
  },
  {
    id: '2',
    title: 'Bombilla fundida en escalera',
    description: 'La bombilla del segundo piso de la escalera principal está fundida',
    priority: 'low',
    status: 'in-progress',
    requestedBy: 'Propietario 2B',
    assignedTo: 'Mantenimiento López',
    createdDate: '2024-06-08',
    estimatedCost: 15,
    category: 'electrical'
  }
];

const PropertyManagerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'communities' | 'accounting' | 'documents' | 'maintenance' | 'reports'>('overview');
  const [selectedCommunity, setSelectedCommunity] = useState<string>(MOCK_COMMUNITIES[0]?.id || '');
  const [communities] = useState<Community[]>(MOCK_COMMUNITIES);
  const [expenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [maintenanceRequests] = useState<MaintenanceRequest[]>(MOCK_MAINTENANCE_REQUESTS);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { t } = useLanguage();

  const currentCommunity = communities.find(c => c.id === selectedCommunity);

  // OCR Processing Simulation
  const processOCRDocument = async (file: File): Promise<Document> => {
    setIsProcessingOCR(true);
    
    // Simulate OCR processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock OCR extraction
    const ocrData = {
      vendor: 'Empresa Ficticia S.L.',
      amount: Math.floor(Math.random() * 1000) + 100,
      date: new Date().toISOString().split('T')[0],
      concept: 'Servicios de mantenimiento',
      vatAmount: 0,
      totalAmount: 0
    };
    ocrData.vatAmount = ocrData.amount * 0.21;
    ocrData.totalAmount = ocrData.amount + ocrData.vatAmount;

    const newDoc: Document = {
      id: Date.now().toString(),
      name: file.name,
      type: 'invoice',
      date: new Date().toISOString().split('T')[0],
      amount: ocrData.totalAmount,
      supplier: ocrData.vendor,
      status: 'processed',
      ocrExtracted: ocrData
    };

    setIsProcessingOCR(false);
    return newDoc;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processedDoc = await processOCRDocument(file);
        setDocuments(prev => [...prev, processedDoc]);
      }
    }
  };

  const calculateMonthlyBalance = () => {
    const totalIncome = currentCommunity ? currentCommunity.units * currentCommunity.monthlyFee : 0;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    return totalIncome - totalExpenses;
  };

  const generateAutomaticAccounting = () => {
    const accountingEntries = documents
      .filter(doc => doc.ocrExtracted)
      .map(doc => ({
        date: doc.ocrExtracted!.date,
        concept: doc.ocrExtracted!.concept,
        debit: doc.ocrExtracted!.totalAmount,
        credit: 0,
        account: '600 - Gastos Generales',
        reference: doc.name
      }));

    // Add income entries
    if (currentCommunity) {
      accountingEntries.push({
        date: new Date().toISOString().split('T')[0],
        concept: 'Cuotas mensuales comunidad',
        debit: 0,
        credit: currentCommunity.units * currentCommunity.monthlyFee,
        account: '700 - Ingresos',
        reference: 'Cuotas-' + new Date().getMonth()
      });
    }

    return accountingEntries;
  };

  const tabs = [
    { key: 'overview', label: 'Resumen', icon: ChartBarIcon, description: 'Vista general de todas las comunidades' },
    { key: 'communities', label: 'Comunidades', icon: BuildingOffice2Icon, description: 'Gestión de comunidades' },
    { key: 'accounting', label: 'Contabilidad', icon: CurrencyEuroIcon, description: 'Contabilidad automatizada' },
    { key: 'documents', label: 'Documentos OCR', icon: DocumentTextIcon, description: 'Gestión documental con OCR' },
    { key: 'maintenance', label: 'Mantenimiento', icon: WrenchScrewdriverIcon, description: 'Solicitudes de mantenimiento' },
    { key: 'reports', label: 'Informes', icon: ClipboardDocumentCheckIcon, description: 'Reportes y análisis' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🏢 Administración de Fincas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Gestiona tus comunidades con herramientas avanzadas de contabilidad automatizada y OCR
            </p>
            
            {/* Community Selector */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Comunidad activa:
              </label>
              <select
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {communities.map(community => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
              Subir Factura OCR
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
              <PlusIcon className="h-4 w-4 mr-2" />
              Nueva Comunidad
            </button>
          </div>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 p-1">
          <nav className="flex space-x-1 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-center text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <tab.icon className="h-6 w-6" />
                  <span className="font-medium">{tab.label}</span>
                  <span className="text-xs opacity-70">{tab.description}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        Comunidades Activas
                      </p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {communities.filter(c => c.status === 'active').length}
                      </p>
                    </div>
                    <BuildingOffice2Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        Unidades Gestionadas
                      </p>
                      <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                        {communities.reduce((sum, c) => sum + c.units, 0)}
                      </p>
                    </div>
                    <UserGroupIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        Balance Mensual
                      </p>
                      <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                        €{calculateMonthlyBalance().toLocaleString()}
                      </p>
                    </div>
                    <BanknotesIcon className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-6 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        Documentos Procesados
                      </p>
                      <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                        {documents.filter(d => d.status === 'processed').length}
                      </p>
                    </div>
                    <DocumentTextIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                </motion.div>
              </div>

              {/* Quick Overview Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Expenses */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    💸 Gastos Recientes
                  </h3>
                  <div className="space-y-3">
                    {expenses.slice(0, 3).map(expense => (
                      <div key={expense.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{expense.concept}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{expense.supplier}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">-€{expense.amount.toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{expense.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Maintenance Requests */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    🔧 Solicitudes de Mantenimiento
                  </h3>
                  <div className="space-y-3">
                    {maintenanceRequests.slice(0, 3).map(request => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{request.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{request.requestedBy}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {request.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                            request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Communities Tab */}
          {activeTab === 'communities' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Gestión de Comunidades
                </h3>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                  <PlusIcon className="h-5 w-5 inline mr-2" />
                  Nueva Comunidad
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {communities.map(community => (
                  <motion.div
                    key={community.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {community.name}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">{community.address}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        community.status === 'active' ? 'bg-green-100 text-green-800' :
                        community.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {community.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Unidades</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {community.units}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cuota Mensual</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          €{community.monthlyFee}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Reservas</p>
                        <p className="text-lg font-semibold text-green-600">
                          €{community.reserves.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Área Total</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {community.totalArea} m²
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Presidente</p>
                          <p className="font-medium text-gray-900 dark:text-white">{community.president}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500 dark:text-gray-400">Próxima Junta</p>
                          <p className="font-medium text-gray-900 dark:text-white">{community.nextMeeting}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">
                        <EyeIcon className="h-4 w-4 inline mr-1" />
                        Ver
                      </button>
                      <button className="flex-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <PencilIcon className="h-4 w-4 inline mr-1" />
                        Editar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Documents OCR Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📄 Gestión Documental con OCR
                </h3>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <CameraIcon className="h-5 w-5 inline mr-2" />
                  Escanear Documento
                </button>
              </div>

              {/* OCR Status */}
              {isProcessingOCR && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6"
                >
                  <div className="flex items-center space-x-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <div>
                      <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        🤖 Procesando con OCR...
                      </h4>
                      <p className="text-blue-700 dark:text-blue-300">
                        Extrayendo datos automáticamente del documento
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Documents List */}
              <div className="grid grid-cols-1 gap-4">
                {documents.map(doc => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {doc.name}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === 'processed' ? 'bg-green-100 text-green-800' :
                            doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {doc.status}
                          </span>
                        </div>
                        
                        {doc.ocrExtracted && (
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                              <BeakerIcon className="h-5 w-5 mr-2 text-green-600" />
                              Datos Extraídos por OCR
                            </h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Proveedor</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.ocrExtracted.vendor}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Concepto</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.ocrExtracted.concept}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Base Imponible</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  €{doc.ocrExtracted.amount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">IVA (21%)</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  €{doc.ocrExtracted.vatAmount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                                <p className="font-bold text-blue-600 text-lg">
                                  €{doc.ocrExtracted.totalAmount.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {doc.ocrExtracted.date}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-12">
                    <DocumentMagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No hay documentos procesados
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Sube facturas y documentos para procesarlos automáticamente con OCR
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ArrowUpTrayIcon className="h-5 w-5 inline mr-2" />
                      Subir Primer Documento
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accounting Tab */}
          {activeTab === 'accounting' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  💰 Contabilidad Automatizada
                </h3>
                <div className="flex space-x-3">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <CalculatorIcon className="h-5 w-5 inline mr-2" />
                    Generar Asientos
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <PrinterIcon className="h-5 w-5 inline mr-2" />
                    Imprimir Balance
                  </button>
                </div>
              </div>

              {/* Automatic Accounting Entries */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <SparklesIcon className="h-6 w-6 mr-2 text-yellow-500" />
                    Asientos Automáticos Generados
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Basados en los documentos procesados con OCR
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Concepto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Cuenta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Debe
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Haber
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Referencia
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {generateAutomaticAccounting().map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.concept}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {entry.account}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                            {entry.debit > 0 ? `€${entry.debit.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                            {entry.credit > 0 ? `€${entry.credit.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {entry.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Balance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-xl">
                  <h5 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                    Ingresos Totales
                  </h5>
                  <p className="text-3xl font-bold text-green-600">
                    €{currentCommunity ? (currentCommunity.units * currentCommunity.monthlyFee).toLocaleString() : '0'}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Cuotas mensuales
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-xl">
                  <h5 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Gastos Totales
                  </h5>
                  <p className="text-3xl font-bold text-red-600">
                    €{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                    Mantenimiento y servicios
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-xl">
                  <h5 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Balance Neto
                  </h5>
                  <p className={`text-3xl font-bold ${calculateMonthlyBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    €{calculateMonthlyBalance().toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    Resultado mensual
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  🔧 Gestión de Mantenimiento
                </h3>
                <button className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                  <PlusIcon className="h-5 w-5 inline mr-2" />
                  Nueva Solicitud
                </button>
              </div>

              <div className="space-y-4">
                {maintenanceRequests.map(request => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <WrenchScrewdriverIcon className="h-6 w-6 text-orange-600" />
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {request.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            request.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            request.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {request.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            request.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                            request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {request.description}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Solicitado por</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {request.requestedBy}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Categoría</p>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {request.category}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Coste Estimado</p>
                            <p className="font-medium text-green-600">
                              €{request.estimatedCost}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Fecha</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {request.createdDate}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                          <CheckCircleIcon className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  📊 Informes y Análisis
                </h3>
                <div className="flex space-x-3">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    <DocumentArrowDownIcon className="h-5 w-5 inline mr-2" />
                    Generar Informe
                  </button>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                    <CloudArrowUpIcon className="h-5 w-5 inline mr-2" />
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Report Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📈 Informe Mensual
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ingresos por cuotas</span>
                      <span className="font-medium text-green-600">
                        €{currentCommunity ? (currentCommunity.units * currentCommunity.monthlyFee).toLocaleString() : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Gastos totales</span>
                      <span className="font-medium text-red-600">
                        €{expenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-semibold text-gray-900 dark:text-white">Balance neto</span>
                      <span className={`font-bold ${calculateMonthlyBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        €{calculateMonthlyBalance().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Year Summary Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    📊 Resumen Anual
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Reservas acumuladas</span>
                      <span className="font-medium text-blue-600">
                        €{currentCommunity?.reserves.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Documentos procesados</span>
                      <span className="font-medium text-purple-600">
                        {documents.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Solicitudes mantenimiento</span>
                      <span className="font-medium text-orange-600">
                        {maintenanceRequests.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Actions */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  📄 Generar Informes Personalizados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="text-blue-600 mb-2">
                      <ChartBarIcon className="h-8 w-8" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Estado Financiero</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Balance e ingresos/gastos</p>
                  </button>
                  
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="text-green-600 mb-2">
                      <DocumentTextIcon className="h-8 w-8" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Libro de Actas</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reuniones y decisiones</p>
                  </button>
                  
                  <button className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="text-purple-600 mb-2">
                      <BanknotesIcon className="h-8 w-8" />
                    </div>
                    <h5 className="font-medium text-gray-900 dark:text-white">Presupuesto Anual</h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Planificación financiera</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyManagerDashboard;