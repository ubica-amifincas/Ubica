import React, { useState, useEffect } from 'react';
import { EmptyState, LoadingState, ErrorAlert, buttonClass } from './ui';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon, 
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
        return <LoadingState />;
    }

    return (
        <div className="space-y-4">
            {error && <ErrorAlert onRetry={loadHistory}>{error}</ErrorAlert>}

            {conversations.length === 0 && !error ? (
                <EmptyState
                    icon={ChatBubbleLeftRightIcon}
                    title="Aún no tienes conversaciones"
                    description="Comienza a chatear con nuestra IA haciendo clic en el botón flotante inferior derecho."
                    action={
                        <button type="button" onClick={() => openChat()} className={buttonClass.primary}>
                            <SparklesIcon className="h-4 w-4" />
                            Iniciar un chat
                        </button>
                    }
                />
            ) : (
                <div className="grid gap-4">
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleOpenConversation(conv.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleOpenConversation(conv.id);
                                }
                            }}
                            className="group flex cursor-pointer flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-800 dark:hover:border-emerald-400"
                        >
                            <div className="flex min-w-0 items-start gap-4">
                                <div className="mt-0.5 flex-shrink-0">
                                    <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-300" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="line-clamp-1 text-base font-semibold text-gray-900 dark:text-white">
                                        {conv.title}
                                    </h3>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <ClockIcon className="h-4 w-4" />
                                            <span>
                                                {new Date(conv.updated_at).toLocaleDateString('es-ES', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div className="tabular-nums">
                                            {conv.message_count} {conv.message_count === 1 ? 'mensaje' : 'mensajes'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenConversation(conv.id);
                                }}
                                className={`${buttonClass.secondary} ml-auto whitespace-nowrap sm:ml-4`}
                            >
                                <span>Continuar</span>
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
