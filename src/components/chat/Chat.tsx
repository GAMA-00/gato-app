
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ChatConversationList from './ChatConversationList';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { useChat } from '@/contexts/ChatContext';

const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { activeConversation, setActiveConversation } = useChat();
  
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
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <MessageCircle className="h-6 w-6" />
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
