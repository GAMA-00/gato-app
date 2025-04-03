
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';

const Chat: React.FC = () => {
  // Since we no longer need the floating chat button,
  // this component will not render anything
  return null;
};

export default Chat;
