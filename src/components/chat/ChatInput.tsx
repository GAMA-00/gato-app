
import React, { useState, useRef } from 'react';
import { Smile, Image, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChat } from '@/contexts/ChatContext';

// Simple emoji picker
const emojis = ['😀', '😂', '😍', '🙌', '👍', '❤️', '😊', '🎉', '🔥', '👏', '🤔', '😎', '😢', '😡', '👋', '🙏', '👌', '🤷‍♂️', '💪', '✅'];

const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage } = useChat();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleAddEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          sendMessage(event.target.result as string, true);
        }
      };
      reader.readAsDataURL(file);
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  return (
    <div className="p-4 border-t flex items-end gap-2">
      <div className="flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Smile className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="grid grid-cols-10 gap-1">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="text-lg p-1 hover:bg-secondary rounded"
                  onClick={() => handleAddEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={() => fileInputRef.current?.click()}
        >
          <Image className="h-5 w-5" />
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </Button>
      </div>
      
      <Input
        placeholder="Escribe un mensaje..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        className="flex-1"
      />
      
      <Button 
        variant={message.trim() ? "default" : "ghost"}
        size="icon" 
        className="h-9 w-9"
        onClick={handleSendMessage}
        disabled={!message.trim()}
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default ChatInput;
