
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Bell } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ChatConversationList from './ChatConversationList';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';

const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeConversation, setActiveConversation, hasUnreadMessages } = useChat();
  
  // Close chat panel when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setIsOpen(false);
      setActiveConversation(null);
    };
    
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [setActiveConversation]);
  
  const handleClose = () => {
    setIsOpen(false);
    setActiveConversation(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="default" 
            size="icon" 
            className="h-12 w-12 rounded-full shadow-lg relative"
          >
            <MessageCircle className="h-6 w-6" />
            {hasUnreadMessages && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
                <Bell className="h-3 w-3" />
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="sm:max-w-md w-[90vw] p-0 flex flex-col h-[80vh]">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">
              {activeConversation 
                ? window.location.pathname.startsWith('/client')
                  ? activeConversation.providerName
                  : activeConversation.clientName
                : 'Mensajes'
              }
            </h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {activeConversation ? (
            <>
              <ChatMessages />
              <ChatInput />
            </>
          ) : (
            <ChatConversationList onSelectConversation={() => {}} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Chat;
