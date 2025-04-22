
import React, { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';

const ChatMessages: React.FC = () => {
  const { activeConversation } = useChat();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  if (!activeConversation || !user) return null;

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {activeConversation.messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No hay mensajes aún. ¡Inicia la conversación!</p>
          </div>
        ) : (
          activeConversation.messages.map(message => {
            const isOwn = message.sender === user.role;
            
            return (
              <div 
                key={message.id} 
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {message.isImage ? (
                    <img 
                      src={message.content} 
                      alt="Shared image" 
                      className="rounded max-w-full" 
                    />
                  ) : (
                    <p>{message.content}</p>
                  )}
                  <div className={`text-xs mt-1 flex items-center gap-1 ${
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {format(message.timestamp, 'HH:mm', { locale: es })}
                    {isOwn && (
                      <span className="ml-1">
                        {message.read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};

export default ChatMessages;
