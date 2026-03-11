import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChatBubbleLeftRightIcon,
    PaperAirplaneIcon,
    ChevronLeftIcon,
    ClockIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import appService from '../../services';

interface Conversation {
    property_id: number;
    property_title: string;
    other_user_id: number;
    other_user_name: string;
    messages: MessageItem[];
    last_message: MessageItem | null;
    unread_count: number;
}

interface MessageItem {
    id: number;
    user_id: number;
    receiver_id: number;
    content: string;
    sender_name: string;
    property_title: string;
    status: string;
    is_mine: boolean;
    created_at: string;
}

export default function MessagesPanel() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadConversations = async () => {
        try {
            const data = await appService.getConversations();
            setConversations(data);
            // If we had a selected conversation, refresh it
            if (selectedConv) {
                const updated = data.find(
                    (c: Conversation) => c.property_id === selectedConv.property_id && c.other_user_id === selectedConv.other_user_id
                );
                if (updated) setSelectedConv(updated);
            }
        } catch (err) {
            console.error('Error loading conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedConv?.messages]);

    const handleReply = async () => {
        if (!replyText.trim() || !selectedConv) return;
        setSending(true);
        try {
            // Find last message from the other person to reply to
            const lastOtherMsg = [...selectedConv.messages].reverse().find(m => !m.is_mine);
            if (lastOtherMsg) {
                await appService.replyMessage(lastOtherMsg.id, replyText.trim());
            } else {
                // No message from the other person yet, send as new message
                await appService.sendMessage({
                    property_id: selectedConv.property_id,
                    receiver_id: selectedConv.other_user_id,
                    content: replyText.trim(),
                });
            }
            setReplyText('');
            await loadConversations();
        } catch (err) {
            console.error('Error sending reply:', err);
        } finally {
            setSending(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        const diffH = Math.floor(diffMin / 60);
        if (diffH < 24) return `Hace ${diffH}h`;
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    const getStatusBadge = (conv: Conversation) => {
        const lastMsg = conv.last_message;
        if (!lastMsg) return null;
        if (lastMsg.is_mine && lastMsg.status === 'pending') {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                    <ClockIcon className="w-3 h-3" /> Pendiente
                </span>
            );
        }
        if (lastMsg.status === 'replied' || (!lastMsg.is_mine)) {
            return (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                    <CheckCircleIcon className="w-3 h-3" /> Respondido
                </span>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    // Chat view when a conversation is selected
    if (selectedConv) {
        return (
            <motion.div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 flex flex-col"
                style={{ height: '500px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setSelectedConv(null)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {selectedConv.property_title}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                            Con: {selectedConv.other_user_name}
                        </p>
                    </div>
                    {getStatusBadge(selectedConv)}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {selectedConv.messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            className={`flex ${msg.is_mine ? 'justify-end' : 'justify-start'}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.is_mine
                                        ? 'bg-emerald-600 text-white rounded-br-md'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md'
                                    }`}
                            >
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                <p className={`text-[10px] mt-1 ${msg.is_mine ? 'text-emerald-200' : 'text-gray-400'}`}>
                                    {formatDate(msg.created_at)}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
                            placeholder="Escribe tu respuesta..."
                            className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            disabled={sending}
                        />
                        <button
                            onClick={handleReply}
                            disabled={!replyText.trim() || sending}
                            className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    }

    // Conversation list
    return (
        <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-gray-800 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Mis Mensajes</h3>
                    {conversations.length > 0 && (
                        <span className="ml-auto text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">
                            {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
                        </span>
                    )}
                </div>
            </div>

            {conversations.length === 0 ? (
                <div className="px-5 py-8 text-center">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tienes conversaciones todavía.
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Envía un mensaje desde el detalle de una propiedad para empezar.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    <AnimatePresence>
                        {conversations.map((conv, idx) => (
                            <motion.button
                                key={`${conv.property_id}_${conv.other_user_id}`}
                                onClick={() => setSelectedConv(conv)}
                                className="w-full px-5 py-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-left"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                            >
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {conv.other_user_name.charAt(0).toUpperCase()}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {conv.property_title}
                                        </h4>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                                            {conv.last_message ? formatDate(conv.last_message.created_at) : ''}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {conv.other_user_name}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-400 truncate max-w-[200px]">
                                            {conv.last_message?.is_mine ? 'Tú: ' : ''}{conv.last_message?.content}
                                        </p>
                                        {getStatusBadge(conv)}
                                    </div>
                                </div>

                                {/* Unread badge */}
                                {conv.unread_count > 0 && (
                                    <span className="bg-emerald-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                                        {conv.unread_count}
                                    </span>
                                )}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </motion.div>
    );
}
