
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "@/components/ui/use-toast";

type Message = {
  id: string;
  sender: 'client' | 'provider';
  content: string;
  timestamp: Date;
  isImage?: boolean;
  read: boolean;
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
  hasUnreadMessages: boolean;
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
        timestamp: new Date(2023, 5, 25, 14, 30),
        read: true
      },
      {
        id: '2',
        sender: 'provider',
        content: 'Claro, ¿qué te gustaría saber?',
        timestamp: new Date(2023, 5, 25, 14, 35),
        read: false
      }
    ],
    unreadCount: 1
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
        timestamp: new Date(2023, 5, 26, 9, 0),
        read: false
      }
    ],
    unreadCount: 1
  },
  {
    id: '3',
    clientId: 'client3',
    providerId: 'provider1',
    clientName: 'Ana Torres',
    providerName: 'Carlos Rodríguez',
    messages: [
      {
        id: '1',
        sender: 'provider',
        content: 'Hola Ana, ya hemos terminado el mantenimiento de tu apartamento',
        timestamp: new Date(2023, 5, 27, 16, 20),
        read: true
      },
      {
        id: '2',
        sender: 'client',
        content: 'Muchas gracias, lo revisaré esta tarde',
        timestamp: new Date(2023, 5, 27, 16, 25),
        read: true
      }
    ],
    unreadCount: 0
  }
];

export const ChatProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);
  
  // Check for unread messages
  useEffect(() => {
    const hasUnread = conversations.some(conv => conv.unreadCount > 0);
    setHasUnreadMessages(hasUnread);
  }, [conversations]);

  const sendMessage = (content: string, isImage: boolean = false) => {
    if (!activeConversation) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: window.location.pathname.startsWith('/client') ? 'client' : 'provider',
      content,
      timestamp: new Date(),
      isImage,
      read: true // Own messages are automatically read
    };
    
    const updatedConversation = {
      ...activeConversation,
      messages: [...activeConversation.messages, newMessage],
      lastMessage: isImage ? '📷 Imagen' : content,
      lastMessageTime: new Date()
    };
    
    setConversations(conversations.map(conv => 
      conv.id === activeConversation.id ? updatedConversation : conv
    ));
    
    setActiveConversation(updatedConversation);
    
    // Show a toast notification
    toast({
      title: "Mensaje enviado",
      description: "Tu mensaje ha sido enviado con éxito",
    });
  };
  
  const markAsRead = (conversationId: string) => {
    setConversations(conversations.map(conv => {
      if (conv.id === conversationId) {
        // Mark all messages as read
        const updatedMessages = conv.messages.map(msg => ({
          ...msg,
          read: true
        }));
        
        return {
          ...conv, 
          messages: updatedMessages,
          unreadCount: 0
        };
      }
      return conv;
    }));
  };

  return (
    <ChatContext.Provider value={{ 
      conversations, 
      activeConversation, 
      setActiveConversation,
      sendMessage,
      markAsRead,
      hasUnreadMessages
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
