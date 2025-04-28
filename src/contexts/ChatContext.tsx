
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

type Message = {
  id: string;
  sender: 'client' | 'provider' | 'admin';
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
  
  // Load messages from Supabase or localStorage as fallback
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      
      try {
        // Try to load from localStorage first as fallback
        const savedConversations = localStorage.getItem('gato_conversations');
        if (savedConversations) {
          try {
            // Parse the JSON and ensure dates are converted back to Date objects
            const parsedConversations = JSON.parse(savedConversations, (key, value) => {
              if (key === 'timestamp') {
                return value ? new Date(value) : null;
              }
              return value;
            });
            setConversations(parsedConversations);
          } catch (error) {
            console.error('Error parsing conversations:', error);
          }
        }
        
        // Load from chat_messages table if available
        if (user.id) {
          // For clients, get messages where they're receiver or sender
          if (user.role === 'client') {
            const { data, error } = await supabase
              .from('chat_messages')
              .select('*')
              .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
              .order('created_at');
              
            if (error) {
              console.error('Error loading chat messages:', error);
            } else if (data && data.length > 0) {
              // Process messages into conversations
              const conversationsMap = new Map<string, Conversation>();
              
              for (const message of data) {
                const isUserSender = message.sender_id === user.id;
                const otherPartyId = isUserSender ? message.receiver_id : message.sender_id;
                
                // Generate a unique conversation ID between these two users
                const conversationId = [user.id, otherPartyId].sort().join('_');
                
                if (!conversationsMap.has(conversationId)) {
                  // Need to fetch other party info
                  const { data: providerData } = await supabase
                    .from('providers')
                    .select('name')
                    .eq('id', otherPartyId)
                    .single();
                    
                  conversationsMap.set(conversationId, {
                    id: conversationId,
                    clientId: user.id,
                    providerId: otherPartyId,
                    clientName: user.name,
                    providerName: providerData?.name || 'Provider',
                    messages: [],
                    unreadCount: 0
                  });
                }
                
                // Add message to conversation
                const conversation = conversationsMap.get(conversationId)!;
                conversation.messages.push({
                  id: message.id,
                  sender: isUserSender ? 'client' : 'provider',
                  content: message.content,
                  timestamp: new Date(message.created_at),
                  isImage: message.is_image || false,
                  read: message.read || false
                });
                
                // Count unread messages
                if (!isUserSender && !message.read) {
                  conversation.unreadCount++;
                }
              }
              
              setConversations(Array.from(conversationsMap.values()));
            }
          } else if (user.role === 'provider') {
            // Similar logic for providers
            const { data, error } = await supabase
              .from('chat_messages')
              .select('*')
              .or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`)
              .order('created_at');
              
            if (error) {
              console.error('Error loading chat messages:', error);
            } else if (data && data.length > 0) {
              // Process messages into conversations
              const conversationsMap = new Map<string, Conversation>();
              
              for (const message of data) {
                const isUserSender = message.sender_id === user.id;
                const otherPartyId = isUserSender ? message.receiver_id : message.sender_id;
                
                // Generate a unique conversation ID between these two users
                const conversationId = [user.id, otherPartyId].sort().join('_');
                
                if (!conversationsMap.has(conversationId)) {
                  // Need to fetch other party info
                  const { data: clientData } = await supabase
                    .from('clients')
                    .select('name')
                    .eq('id', otherPartyId)
                    .single();
                    
                  conversationsMap.set(conversationId, {
                    id: conversationId,
                    providerId: user.id,
                    clientId: otherPartyId,
                    providerName: user.name,
                    clientName: clientData?.name || 'Client',
                    messages: [],
                    unreadCount: 0
                  });
                }
                
                // Add message to conversation
                const conversation = conversationsMap.get(conversationId)!;
                conversation.messages.push({
                  id: message.id,
                  sender: isUserSender ? 'provider' : 'client',
                  content: message.content,
                  timestamp: new Date(message.created_at),
                  isImage: message.is_image || false,
                  read: message.read || false
                });
                
                // Count unread messages
                if (!isUserSender && !message.read) {
                  conversation.unreadCount++;
                }
              }
              
              setConversations(Array.from(conversationsMap.values()));
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    };
    
    loadConversations();
  }, [user]);

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
      id: `${user.id}_${providerId}`,
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

  const sendMessage = async (content: string, isImage: boolean = false) => {
    if (!activeConversation || !user) return;
    
    try {
      // Make sure we handle the admin role as well
      const senderRole = user.role === 'admin' ? 'admin' : (user.role === 'client' ? 'client' : 'provider');
      
      // Get sender and receiver IDs based on roles
      const senderId = user.id;
      const receiverId = user.role === 'client' ? activeConversation.providerId : activeConversation.clientId;
      
      // Insert new message into chat_messages table
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content: content,
          conversation_id: activeConversation.id,
          is_image: isImage,
          read: false
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error sending message:', error);
        toast.error('Error sending message');
        return;
      }
      
      // Create the new message for the UI
      const newMessage: Message = {
        id: data.id,
        sender: senderRole,
        content,
        timestamp: new Date(),
        isImage,
        read: false
      };
      
      const updatedMessages = [...activeConversation.messages, newMessage];
      
      const updatedConversation = {
        ...activeConversation,
        messages: updatedMessages,
        // Increment unread count for the other party
        unreadCount: user.role === 'client' ? 1 : 0
      };
      
      setConversations(conversations.map(conv => 
        conv.id === activeConversation.id ? updatedConversation : conv
      ));
      
      setActiveConversation(updatedConversation);
      
      toast.success("Mensaje enviado");
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast.error('Error al enviar mensaje');
    }
  };
  
  const markAsRead = async (conversationId: string) => {
    if (!user) return;
    
    try {
      // Update the database
      if (user.id) {
        const { error } = await supabase
          .from('chat_messages')
          .update({ read: true })
          .eq(user.role === 'client' ? 'receiver_id' : 'sender_id', user.id)
          .eq('conversation_id', conversationId);
          
        if (error) {
          console.error('Error marking messages as read:', error);
        }
      }
      
      // Update the UI
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
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
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
