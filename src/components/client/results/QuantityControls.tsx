import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface QuantityControlsProps {
  quantity: number;
  onQuantityChange: (change: number) => void;
  disabled?: boolean;
  maxQuantity?: number;
  minQuantity?: number;
  size?: 'mobile' | 'desktop';
  className?: string;
}

const QuantityControls = ({ 
  quantity, 
  onQuantityChange, 
  disabled = false,
  maxQuantity,
  minQuantity = 0,
  size = 'desktop',
  className = ''
}: QuantityControlsProps) => {
  const isMobile = size === 'mobile';
  const textSize = isMobile ? 'text-base' : 'text-lg';
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onQuantityChange(-1)}
        disabled={disabled || quantity <= minQuantity}
        className="h-8 w-8 p-0 shrink-0 rounded-full"
      >
        <Minus className="h-3 w-3" />
      </Button>
      
      <span className={`min-w-[2rem] text-center font-medium ${textSize}`}>
        {quantity}
      </span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onQuantityChange(1)}
        disabled={disabled || (maxQuantity ? quantity >= maxQuantity : false)}
        className="h-8 w-8 p-0 shrink-0 rounded-full"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default QuantityControls;