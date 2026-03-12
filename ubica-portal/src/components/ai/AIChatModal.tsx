import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { XMarkIcon, PaperAirplaneIcon, MinusIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import appService from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { useAIChat } from '../../contexts/AIChatContext';


interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AIChatModal() {
    const { 
        isOpen, 
        isMinimized, 
        searchContext, 
        activeConversationId, 
        preloadedMessages, 
        closeChat, 
        minimizeChat, 
        maximizeChat 
    } = useAIChat();

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: '¡Hola! 👋 Soy el asistente inmobiliario de Ubica. Puedo ayudarte a encontrar la propiedad ideal. ¿Qué tipo de propiedad estás buscando?',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { isAuthenticated } = useAuth();
    const [hasReachedLimit, setHasReachedLimit] = useState(false);
    const dragControls = useDragControls();
    const constraintsRef = useRef<HTMLDivElement>(null);

    // Resize and Fullscreen state
    const [dimensions, setDimensions] = useState({ width: 420, height: 600 });
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);

    const toggleFullScreen = () => {
        setIsFullScreen(!isFullScreen);
    };

    const startResizing = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
    };

    useEffect(() => {
        if (!isResizing) return;

        const handlePointerMove = (e: PointerEvent) => {
            if (!windowRef.current) return;
            const rect = windowRef.current.getBoundingClientRect();
            
            // We resize from top-left, but the window is anchored to bottom-right
            // So we calculate the delta from the current right/bottom edges
            const newWidth = Math.max(320, Math.min(window.innerWidth - 40, rect.right - e.clientX));
            const newHeight = Math.max(400, Math.min(window.innerHeight - 40, rect.bottom - e.clientY));

            setDimensions({ width: newWidth, height: newHeight });
        };

        const handlePointerUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isResizing]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, isMinimized]);

    // Pre-fill with search context if provided
    useEffect(() => {
        if (isOpen && searchContext && messages.length === 1 && !activeConversationId) {
            setInput(searchContext);
        }
    }, [isOpen, searchContext, activeConversationId]);

    // Load preloaded conversation if one is set
    useEffect(() => {
        if (activeConversationId && preloadedMessages && preloadedMessages.length > 0) {
            const parsedMessages: Message[] = preloadedMessages.map((msg, idx) => ({
                id: `history-${idx}`,
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
                timestamp: new Date() // El timestamp en JSON no importa ahora, solo el orden
            }));
            setMessages(parsedMessages);
        } else if (!activeConversationId) {
             // Reset to welcome prompt if we change to a new unknown id
              setMessages([
                  {
                      id: 'welcome',
                      role: 'assistant',
                      content: '¡Hola! 👋 Soy el asistente inmobiliario de Ubica. Puedo ayudarte a encontrar la propiedad ideal. ¿Qué tipo de propiedad estás buscando?',
                      timestamp: new Date(),
                  },
              ]);
        }
    }, [activeConversationId, preloadedMessages]);

    // Reset drag position when fullscreen toggles to avoid ghost offsets
    useEffect(() => {
        if (isFullScreen) {
            // We can't easily reset drag position of x/y directly via props if it's 'drag',
            // but we can force it via the animate prop of motion.div
            // However, a simpler way is to ensure x and y are always 0 in the animate object when isFullScreen
        }
    }, [isFullScreen]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await appService.sendAIMessage(
                text, 
                messages.map(m => ({ role: m.role, content: m.content })),
                activeConversationId
            );

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: response.message,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            const isQuotaError = error.message?.includes('límite') || error.message?.includes('429');

            if (isQuotaError) {
                setHasReachedLimit(true);
            } else {
                const errorMessage: Message = {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: error.message || 'Lo siento, no pude procesar tu consulta. El servicio de IA se configurará próximamente.',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            }
        } finally {

            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const unreadCount = messages.filter(m => m.role === 'assistant').length - 1;

    return (
        <>
            {/* Drag constraints container - full viewport */}
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-[9990]" />

            <AnimatePresence>
                {/* ===== MINIMIZED BUBBLE ===== */}
                {isOpen && isMinimized && (
                    <motion.button
                        key="minimized-bubble"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        onClick={maximizeChat}
                        className="fixed bottom-6 right-6 z-[9999] group"
                    >
                        <div className="relative">
                            {/* Animated gradient ring */}
                            <div className="absolute -inset-[3px] rounded-full opacity-80 group-hover:opacity-100 transition-opacity"
                                style={{
                                    background: 'conic-gradient(from var(--ai-angle, 0deg), #8b5cf6, #06b6d4, #10b981, #8b5cf6)',
                                    animation: 'aiGradientSpin 3s linear infinite',
                                }}
                            />
                            <div className="relative w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-xl group-hover:shadow-2xl transition-shadow">
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                                    <defs>
                                        <linearGradient id="aiBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#8b5cf6" />
                                            <stop offset="50%" stopColor="#06b6d4" />
                                            <stop offset="100%" stopColor="#10b981" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                                        fill="url(#aiBubbleGrad)" />
                                </svg>
                            </div>
                            {/* Notification badge */}
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </div>
                    </motion.button>
                )}

                {/* ===== FULL CHAT WINDOW ===== */}
                {isOpen && !isMinimized && (
                    <>
                        {/* Backdrop - click to minimize instead of close */}
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={minimizeChat}
                            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998]"
                        />

                        {/* Draggable & Resizable Chat Window */}
                        <motion.div
                            key="chat-window"
                            ref={windowRef}
                            drag={!isFullScreen && !isResizing}
                            dragControls={dragControls}
                            dragListener={false}
                            dragMomentum={false}
                            dragConstraints={constraintsRef}
                            dragElastic={0.05}
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1, 
                                // Reset x and y to 0 when in fullscreen to fix the displacement bug
                                x: isFullScreen ? 0 : undefined,
                                y: isFullScreen ? 0 : undefined, // Allow drag persistence when NOT fullscreen
                                width: isFullScreen ? '95vw' : (window.innerWidth < 640 ? '100vw' : dimensions.width),
                                height: isFullScreen ? '92vh' : (window.innerWidth < 640 ? '100vh' : dimensions.height),
                                // Centering logic for fullscreen
                                left: isFullScreen ? '2.5vw' : undefined,
                                top: isFullScreen ? '4vh' : undefined,
                                right: isFullScreen ? 'auto' : (window.innerWidth < 640 ? '0' : '1.5rem'),
                                bottom: isFullScreen ? 'auto' : (window.innerWidth < 640 ? '0' : '1.5rem'),
                            }}
                            layout
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                            className={`fixed flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-gray-200 dark:border-gray-700 overflow-hidden 
                                ${isFullScreen 
                                    ? 'rounded-2xl z-[10002]' 
                                    : 'sm:rounded-2xl border sm:z-[9999]'
                                } 
                                ${window.innerWidth < 640 && !isFullScreen ? 'inset-0 border-t' : ''}
                                ${isResizing ? 'select-none' : ''}`}
                            style={{ 
                                touchAction: 'none'
                            }}
                        >
                            {/* Resize Handle - Top Left */}
                            {!isFullScreen && window.innerWidth >= 640 && (
                                <div 
                                    onPointerDown={startResizing}
                                    className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-[10001] group flex items-center justify-center"
                                    title="Arrastra para redimensionar"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-violet-400 transition-colors" />
                                </div>
                            )}

                            {/* Header - Drag handle */}
                            <div
                                className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing select-none"
                                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.08) 50%, rgba(16,185,129,0.08) 100%)' }}
                                onPointerDown={(e) => dragControls.start(e)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Animated sparkle icon */}
                                    <div className="relative">
                                        <div className="absolute -inset-1 rounded-full opacity-60"
                                            style={{
                                                background: 'conic-gradient(from var(--ai-angle, 0deg), #8b5cf6, #06b6d4, #10b981, #8b5cf6)',
                                                animation: 'aiGradientSpin 3s linear infinite',
                                            }}
                                        />
                                        <div className="relative bg-white dark:bg-gray-800 rounded-full p-2">
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                                                <defs>
                                                    <linearGradient id="aiChatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#8b5cf6" />
                                                        <stop offset="50%" stopColor="#06b6d4" />
                                                        <stop offset="100%" stopColor="#10b981" />
                                                    </linearGradient>
                                                </defs>
                                                <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z"
                                                    fill="url(#aiChatGrad)" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
                                            Ubica IA
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Asistente inmobiliario</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Minimize button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); minimizeChat(); }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                        title="Minimizar"
                                    >
                                        <MinusIcon className="h-4 w-4" />
                                    </motion.button>
                                    {/* Fullscreen/Maximize button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); toggleFullScreen(); }}
                                        className={`p-2 rounded-lg transition-colors hidden sm:block ${isFullScreen ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-gray-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'}`}
                                        title={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
                                    >
                                        <ArrowsPointingOutIcon className="h-4 w-4" />
                                    </motion.button>
                                    {/* Close button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={(e) => { e.stopPropagation(); closeChat(); }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title="Cerrar"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </motion.button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-left">
                                {messages.map((message) => (
                                    <motion.div
                                        key={message.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${message.role === 'user'
                                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-br-md'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md border border-gray-200 dark:border-gray-700'
                                                }`}
                                        >
                                            {message.role === 'assistant' ? (
                                                <div className="prose prose-sm dark:prose-invert max-w-none text-left prose-p:leading-relaxed prose-pre:bg-gray-200 dark:prose-pre:bg-gray-700 prose-pre:p-2 prose-pre:rounded">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                            ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                                            ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                                            li: ({ children }) => <li className="mb-1">{children}</li>,
                                                            strong: ({ children }) => <strong className="font-bold text-violet-600 dark:text-violet-400">{children}</strong>,
                                                            code: ({ children }) => <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded font-mono text-xs">{children}</code>,
                                                            a: ({ node, ...props }) => {
                                                                const isInternal = props.href?.startsWith('/');
                                                                if (isInternal) {
                                                                    return <Link to={props.href!} onClick={closeChat} className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-md font-semibold text-xs hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors">{props.children} →</Link>;
                                                                }
                                                                return <a {...props} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline" />;
                                                            }
                                                        }}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                message.content
                                            )}
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Typing indicator */}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex justify-start"
                                    >
                                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 flex items-center gap-1.5">
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                                                className="w-2 h-2 rounded-full bg-violet-400"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                                                className="w-2 h-2 rounded-full bg-cyan-400"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.3, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                                                className="w-2 h-2 rounded-full bg-emerald-400"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                                {hasReachedLimit && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-center space-y-3"
                                    >
                                        <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
                                            {isAuthenticated
                                                ? "Has agotado tus consultas gratuitas. ¿Quieres pasar a un Plan Premium para uso ilimitado?"
                                                : "Para seguir usando nuestro asistente de IA gratis, por favor regístrate."}
                                        </p>
                                        <div className="flex gap-2 justify-center">
                                            {isAuthenticated ? (
                                                <Link
                                                    to="/pricing"
                                                    className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
                                                >
                                                    Ver Planes Premium
                                                </Link>
                                            ) : (
                                                <>
                                                    <Link
                                                        to="/login"
                                                        className="px-4 py-2 bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 text-xs font-bold rounded-lg border border-violet-200 dark:border-violet-700 hover:bg-violet-50 transition-colors"
                                                    >
                                                        Iniciar Sesión
                                                    </Link>
                                                    <Link
                                                        to="/register"
                                                        className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
                                                    >
                                                        Registrarse Gratis
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>


                            {/* Input Area */}
                            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2 border border-gray-200 dark:border-gray-700 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:focus-within:ring-violet-900 transition-all">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Pregunta sobre propiedades..."
                                        disabled={isLoading}
                                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 border-0 focus:outline-none focus:ring-0 disabled:opacity-50"
                                    />
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={sendMessage}
                                        disabled={!input.trim() || isLoading}
                                        className="p-2 rounded-lg disabled:opacity-30 transition-all"
                                        style={{
                                            background: input.trim() && !isLoading
                                                ? 'linear-gradient(135deg, #8b5cf6, #06b6d4, #10b981)'
                                                : 'transparent',
                                        }}
                                    >
                                        <PaperAirplaneIcon className={`h-4 w-4 ${input.trim() && !isLoading ? 'text-white' : 'text-gray-400'}`} />
                                    </motion.button>
                                </div>
                                <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                                    Ubica IA · Respuestas generadas por inteligencia artificial
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Keyframes */}
            <style>{`
                @property --ai-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                }
                @keyframes aiGradientSpin {
                    to { --ai-angle: 360deg; }
                }
            `}</style>
        </>
    );
}
