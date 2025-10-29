import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ScrollIndicator: React.FC = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth'
    });
  };

  if (!visible) return null;

  return (
    <div className="flex flex-col items-center gap-2 animate-bounce">
      <p className="text-sm text-muted-foreground font-medium">
        Desliza para seleccionar método de pago
      </p>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        className="rounded-full"
        aria-label="Ir a método de pago"
      >
        <ChevronDown className="h-6 w-6" />
      </Button>
    </div>
  );
};
