import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SlotCardProps {
  time: string;
  period: 'AM' | 'PM';
  isEnabled: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'provider' | 'client';
  isSelected?: boolean;
  isAvailable?: boolean;
  className?: string;
}

const SlotCard = ({ 
  time, 
  period, 
  isEnabled, 
  onClick, 
  size = 'md',
  variant = 'provider',
  isSelected = false,
  isAvailable = true,
  className
}: SlotCardProps) => {
  
  const sizeClasses = {
    sm: 'h-12 w-16 text-xs',
    md: 'h-16 w-20 text-sm',
    lg: 'h-20 w-24 text-base'
  };

  const getButtonStyles = () => {
    if (variant === 'client') {
      if (isSelected) {
        return 'bg-primary text-primary-foreground border-primary border-2 hover:bg-primary/90 shadow-md';
      }
      if (!isAvailable) {
        return 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50';
      }
      return 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground';
    }
    
    // Provider variant
    if (isEnabled) {
      return 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100';
    }
    return 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100';
  };

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={variant === 'client' && !isAvailable}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
        sizeClasses[size],
        getButtonStyles(),
        'hover:scale-105 active:scale-95',
        className
      )}
    >
      <span className="font-bold leading-none">{time}</span>
      <span className="text-xs opacity-75 leading-none">{period}</span>
    </Button>
  );
};

export default SlotCard;