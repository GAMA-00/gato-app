
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import { useAuth } from './AuthContext';

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
  startNewConversation: (providerId: string, providerName: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);
  
  // Load conversations from localStorage
  useEffect(() => {
    const savedConversations = localStorage.getItem('gato_conversations');
    if (savedConversations) {
      try {
        // Parse the JSON and ensure dates are converted back to Date objects
        const parsedConversations = JSON.parse(savedConversations, (key, value) => {
          if (key === 'timestamp' || key === 'lastMessageTime') {
            return value ? new Date(value) : null;
          }
          return value;
        });
        setConversations(parsedConversations);
      } catch (error) {
        console.error('Error parsing conversations:', error);
        setConversations([]);
      }
    }
  }, []);

  // Save conversations to localStorage when they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('gato_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);
  
  // Check for unread messages
  useEffect(() => {
    const hasUnread = conversations.some(conv => {
      // For clients, check if provider messages are unread
      if (user?.role === 'client') {
        return conv.clientId === user.id && conv.unreadCount > 0;
      }
      // For providers, check if client messages are unread
      else if (user?.role === 'provider') {
        return conv.providerId === user.id && conv.unreadCount > 0;
      }
      return false;
    });
    
    setHasUnreadMessages(hasUnread);
  }, [conversations, user]);

  // Filter conversations relevant to the current user
  const userConversations = conversations.filter(conv => {
    if (user?.role === 'client') {
      return conv.clientId === user.id;
    } else if (user?.role === 'provider') {
      return conv.providerId === user.id;
    }
    return false;
  });

  const startNewConversation = (providerId: string, providerName: string) => {
    if (!user) return;

    // Check if a conversation already exists with this provider
    const existingConversation = conversations.find(
      conv => conv.clientId === user.id && conv.providerId === providerId
    );

    if (existingConversation) {
      setActiveConversation(existingConversation);
      return;
    }

    // Create a new conversation
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      clientId: user.id,
      providerId: providerId,
      clientName: user.name,
      providerName: providerName,
      messages: [],
      unreadCount: 0
    };

    setConversations(prev => [...prev, newConversation]);
    setActiveConversation(newConversation);
    toast.success("Nueva conversación iniciada");
  };

  const sendMessage = (content: string, isImage: boolean = false) => {
    if (!activeConversation || !user) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: user.role,
      content,
      timestamp: new Date(),
      isImage,
      read: false
    };
    
    const updatedMessages = [...activeConversation.messages, newMessage];
    
    const updatedConversation = {
      ...activeConversation,
      messages: updatedMessages,
      lastMessage: isImage ? '📷 Imagen' : content,
      lastMessageTime: new Date(),
      // Increment unread count for the other party
      unreadCount: user.role === 'client' ? 1 : 0
    };
    
    setConversations(conversations.map(conv => 
      conv.id === activeConversation.id ? updatedConversation : conv
    ));
    
    setActiveConversation(updatedConversation);
    
    toast.success("Mensaje enviado");
  };
  
  const markAsRead = (conversationId: string) => {
    if (!user) return;
    
    setConversations(conversations.map(conv => {
      if (conv.id === conversationId) {
        // Mark messages as read only if they were sent by the other party
        const updatedMessages = conv.messages.map(msg => ({
          ...msg,
          read: msg.sender !== user.role ? true : msg.read
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
      conversations: userConversations, 
      activeConversation, 
      setActiveConversation,
      sendMessage,
      markAsRead,
      hasUnreadMessages,
      startNewConversation
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
