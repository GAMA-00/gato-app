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
  recommended?: boolean;
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
  recommended = false,
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
        return 'bg-black text-white border-black hover:bg-black hover:text-white shadow-lg ring-2 ring-black/20';
      }
      if (!isAvailable) {
        return 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50';
      }
      return 'bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground hover:border-accent';
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
        'relative overflow-hidden flex flex-col items-center justify-center gap-0.5 transition-all duration-200',
        sizeClasses[size],
        getButtonStyles(),
        isSelected && variant === 'client' ? 'transform scale-105' : 'hover:scale-105 active:scale-95',
        className
      )}
    >
      {variant === 'client' && recommended && isAvailable && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 w-0 h-0 border-t-[16px] border-l-[16px] md:border-t-[20px] md:border-l-[20px] border-t-warning border-l-transparent"
          />
          <span className="absolute left-1 top-1 text-[10px] font-medium text-warning">
            Recomendado
          </span>
        </>
      )}
      <span className="font-bold leading-none">{time}</span>
      <span className="text-xs opacity-75 leading-none">{period}</span>
    </Button>
  );
};

export default SlotCard;