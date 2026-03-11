import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon, 
  TrashIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { appService } from '../../services';
import { useAIChat } from '../../contexts/AIChatContext';

interface AIConversation {
  id: number;
  title: string;
  updated_at: string;
  message_count: number;
}

export const AIHistoryPanel: React.FC = () => {
    const { user } = useAuth();
    const { openChat, loadConversation } = useAIChat();
    const [conversations, setConversations] = useState<AIConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        
        loadHistory();
    }, [user]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const data = await appService.getAIConversations();
            setConversations(data);
            setError(null);
        } catch (err: any) {
            console.error("Error loading AI history:", err);
            setError("No se pudo cargar el historial de conversaciones.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenConversation = async (convId: number) => {
        try {
            // Cargar los detalles completos que incluyen los mensajes
            const details = await appService.getAIConversationDetails(convId);
            
            // Pasamos al context global
            loadConversation(details.id, details.messages);
            
            // Y abrimos el widget flotante si estuviera cerrado
            openChat();
        } catch (err) {
            console.error("Error opening conversation:", err);
            alert("Hubo un error al intentar abrir la conversación.");
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-dark-paper rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 focus:outline-none p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <SparklesIcon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Historial de IA
                    </h2>
                </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-8">
                Aquí puedes retomar cualquiera de tus últimas 5 consultas con el asistente de Ubica.
            </p>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                    {error}
                </div>
            )}

            {conversations.length === 0 && !error ? (
                <div className="text-center py-16 bg-gray-50 dark:bg-dark-bg rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                    <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Aún no tienes conversaciones
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                        Comienza a chatear con nuestra IA haciendo clic en el botón flotante inferior derecho.
                    </p>
                    <button
                        onClick={() => openChat()}
                        className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium shadow-sm hover:shadow-md"
                    >
                        Iniciar un Chat
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {conversations.map((conv, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={conv.id}
                            onClick={() => handleOpenConversation(conv.id)}
                            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-white dark:bg-dark-paper border border-gray-100 dark:border-gray-800 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:border-primary/30 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom"></div>
                            
                            <div className="flex items-start space-x-4 mb-4 sm:mb-0">
                                <div className="mt-1 flex-shrink-0">
                                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                        {conv.title}
                                    </h3>
                                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center space-x-1">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>
                                                {new Date(conv.updated_at).toLocaleDateString('es-ES', { 
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div>
                                            {conv.message_count} {conv.message_count === 1 ? 'mensaje' : 'mensajes'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4 ml-auto sm:ml-4">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenConversation(conv.id);
                                    }}
                                    className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors font-medium text-sm flex items-center space-x-2 whitespace-nowrap"
                                >
                                    <span>Continuar</span>
                                    <ChevronRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
