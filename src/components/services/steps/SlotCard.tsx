import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

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
    sm: 'h-14 w-20 text-sm md:h-12 md:w-16 md:text-xs',
    md: 'h-20 w-24 text-base md:h-16 md:w-20 md:text-sm',
    lg: 'h-24 w-28 text-lg md:h-20 md:w-24 md:text-base'
  };
  const getButtonStyles = () => {
    if (variant === 'client') {
      if (isSelected) {
        // High contrast selection with primary color and prominent visual indicators
        return 'bg-primary text-primary-foreground border-2 border-primary hover:bg-primary hover:text-primary-foreground shadow-lg ring-2 ring-primary/30 scale-105';
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
        isSelected && variant === 'client' ? 'transform' : 'hover:scale-105 active:scale-95',
        className
      )}
    >
      {/* Check icon for selected state */}
      {isSelected && variant === 'client' && (
        <span className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow-md border border-primary/20 z-10">
          <Check className="h-3 w-3 text-primary" strokeWidth={3} />
        </span>
      )}
      {variant === 'client' && recommended && isAvailable && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 w-0 h-0 border-t-[16px] border-l-[16px] md:border-t-[20px] md:border-l-[20px] border-t-warning border-l-transparent"
          />
          <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-warning leading-none">
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