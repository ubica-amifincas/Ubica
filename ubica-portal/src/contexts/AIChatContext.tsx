import { createContext, useContext, useState, type ReactNode } from 'react';

interface AIChatContextType {
    isOpen: boolean;
    isMinimized: boolean;
    searchContext: string;
    activeConversationId: number | null;
    preloadedMessages: any[];
    openChat: (searchContext?: string) => void;
    loadConversation: (id: number, messages: any[]) => void;
    closeChat: () => void;
    minimizeChat: () => void;
    maximizeChat: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [searchContext, setSearchContext] = useState('');
    const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
    const [preloadedMessages, setPreloadedMessages] = useState<any[]>([]);

    const openChat = (ctx?: string) => {
        setSearchContext(ctx || '');
        setIsOpen(true);
        setIsMinimized(false);
    };

    const loadConversation = (id: number, messages: any[]) => {
        setActiveConversationId(id);
        setPreloadedMessages(messages);
        setIsOpen(true);
        setIsMinimized(false);
    };

    const closeChat = () => {
        setIsOpen(false);
        setIsMinimized(false);
        setActiveConversationId(null);
        setPreloadedMessages([]);
    };

    const minimizeChat = () => {
        setIsMinimized(true);
    };

    const maximizeChat = () => {
        setIsMinimized(false);
    };

    return (
        <AIChatContext.Provider value={{ 
            isOpen, isMinimized, searchContext, 
            activeConversationId, preloadedMessages, 
            openChat, loadConversation, closeChat, minimizeChat, maximizeChat 
        }}>
            {children}
        </AIChatContext.Provider>
    );
}

export function useAIChat() {
    const ctx = useContext(AIChatContext);
    if (!ctx) throw new Error('useAIChat must be used within AIChatProvider');
    return ctx;
}
