
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { hasUnreadMessages } = useChat();
  const isClient = window.location.pathname.startsWith('/client');
  
  const handleChatClick = () => {
    if (isClient) {
      navigate('/client/messages');
    } else {
      navigate('/messages');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 md:hidden">
      <Button 
        variant="default" 
        size="icon" 
        className="h-12 w-12 rounded-full shadow-lg relative"
        onClick={handleChatClick}
      >
        <MessageCircle className="h-6 w-6" />
        {hasUnreadMessages && (
          <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
            <Bell className="h-3 w-3" />
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default Chat;
