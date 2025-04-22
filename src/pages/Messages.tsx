
import React, { useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useChat } from '@/contexts/ChatContext';
import ChatConversationList from '@/components/chat/ChatConversationList';
import ChatMessages from '@/components/chat/ChatMessages';
import ChatInput from '@/components/chat/ChatInput';
import { Card } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

const Messages = () => {
  const { activeConversation, setActiveConversation, markAsRead } = useChat();
  
  // Clear active conversation when navigating away from this page
  useEffect(() => {
    return () => setActiveConversation(null);
  }, [setActiveConversation]);
  
  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (activeConversation) {
      markAsRead(activeConversation.id);
    }
  }, [activeConversation, markAsRead]);

  return (
    <PageContainer 
      title="Mensajes" 
      subtitle="Administra tus comunicaciones con clientes"
      action={null}
    >
      <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-220px)]">
        <Card className="w-full md:w-96 flex flex-col h-full">
          <div className="p-4 border-b">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Conversaciones
            </h2>
          </div>
          <ChatConversationList 
            onSelectConversation={() => {}}
            className="flex-1"
          />
        </Card>
        
        {activeConversation ? (
          <Card className="flex-1 flex flex-col h-full">
            <div className="border-b p-4">
              <h2 className="text-lg font-medium">
                {activeConversation.clientName}
              </h2>
            </div>
            <ChatMessages />
            <ChatInput />
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center h-full bg-muted/20">
            <div className="text-center p-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay conversación seleccionada</h3>
              <p className="text-muted-foreground">
                Selecciona una conversación para ver sus mensajes
              </p>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
};

export default Messages;
