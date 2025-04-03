
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChat } from '@/contexts/ChatContext';

interface ChatConversationListProps {
  onSelectConversation: () => void;
}

const ChatConversationList: React.FC<ChatConversationListProps> = ({ onSelectConversation }) => {
  const { conversations, setActiveConversation, markAsRead } = useChat();
  const isClient = window.location.pathname.startsWith('/client');

  const handleSelectConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversation(conversation);
      markAsRead(conversationId);
      onSelectConversation();
    }
  };

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2">
        {conversations.length > 0 ? (
          conversations.map(conversation => {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            
            return (
              <div
                key={conversation.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="font-medium">
                    {isClient 
                      ? conversation.providerName.charAt(0) 
                      : conversation.clientName.charAt(0)}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-medium truncate">
                      {isClient ? conversation.providerName : conversation.clientName}
                    </h3>
                    {lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {format(lastMessage.timestamp, 'd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                  
                  {lastMessage && (
                    <p className="text-sm text-muted-foreground truncate">
                      {lastMessage.isImage ? '📷 Imagen' : lastMessage.content}
                    </p>
                  )}
                </div>
                
                {conversation.unreadCount > 0 && (
                  <Badge variant="default" className="rounded-full h-5 min-w-5 flex items-center justify-center p-0 text-xs">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay conversaciones aún</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default ChatConversationList;
