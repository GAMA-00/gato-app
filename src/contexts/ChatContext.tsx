
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Message = {
  id: string;
  sender: 'client' | 'provider';
  content: string;
  timestamp: Date;
  isImage?: boolean;
};

type Conversation = {
  id: string;
  clientId: string;
  providerId: string;
  clientName: string;
  providerName: string;
  messages: Message[];
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
};

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string, isImage?: boolean) => void;
  markAsRead: (conversationId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Mock data for conversations
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    clientId: 'client1',
    providerId: 'provider1',
    clientName: 'María López',
    providerName: 'Carlos Rodríguez',
    messages: [
      {
        id: '1',
        sender: 'client',
        content: 'Hola, necesito información sobre el servicio de limpieza',
        timestamp: new Date(2023, 5, 25, 14, 30)
      },
      {
        id: '2',
        sender: 'provider',
        content: 'Claro, ¿qué te gustaría saber?',
        timestamp: new Date(2023, 5, 25, 14, 35)
      }
    ],
    unreadCount: 0
  },
  {
    id: '2',
    clientId: 'client2',
    providerId: 'provider1',
    clientName: 'Juan García',
    providerName: 'Carlos Rodríguez',
    messages: [
      {
        id: '1',
        sender: 'client',
        content: '¿Tienes disponibilidad para mañana?',
        timestamp: new Date(2023, 5, 26, 9, 0)
      }
    ],
    unreadCount: 1
  }
];

export const ChatProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const sendMessage = (content: string, isImage: boolean = false) => {
    if (!activeConversation) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: window.location.pathname.startsWith('/client') ? 'client' : 'provider',
      content,
      timestamp: new Date(),
      isImage
    };
    
    const updatedConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, newMessage],
      lastMessage: content,
      lastMessageTime: new Date()
    };
    
    setConversations(conversations.map(conv => 
      conv.id === activeConversation.id ? updatedConversation : conv
    ));
    
    setActiveConversation(updatedConversation);
  };
  
  const markAsRead = (conversationId: string) => {
    setConversations(conversations.map(conv => 
      conv.id === conversationId ? {...conv, unreadCount: 0} : conv
    ));
  };

  return (
    <ChatContext.Provider value={{ 
      conversations, 
      activeConversation, 
      setActiveConversation,
      sendMessage,
      markAsRead
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
