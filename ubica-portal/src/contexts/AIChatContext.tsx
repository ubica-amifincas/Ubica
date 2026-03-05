import { createContext, useContext, useState, type ReactNode } from 'react';

interface AIChatContextType {
    isOpen: boolean;
    isMinimized: boolean;
    searchContext: string;
    openChat: (searchContext?: string) => void;
    closeChat: () => void;
    minimizeChat: () => void;
    maximizeChat: () => void;
}

const AIChatContext = createContext<AIChatContextType | undefined>(undefined);

export function AIChatProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [searchContext, setSearchContext] = useState('');

    const openChat = (ctx?: string) => {
        setSearchContext(ctx || '');
        setIsOpen(true);
        setIsMinimized(false);
    };

    const closeChat = () => {
        setIsOpen(false);
        setIsMinimized(false);
    };

    const minimizeChat = () => {
        setIsMinimized(true);
    };

    const maximizeChat = () => {
        setIsMinimized(false);
    };

    return (
        <AIChatContext.Provider value={{ isOpen, isMinimized, searchContext, openChat, closeChat, minimizeChat, maximizeChat }}>
            {children}
        </AIChatContext.Provider>
    );
}

export function useAIChat() {
    const ctx = useContext(AIChatContext);
    if (!ctx) throw new Error('useAIChat must be used within AIChatProvider');
    return ctx;
}
