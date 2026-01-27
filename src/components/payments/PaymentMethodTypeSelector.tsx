import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Banknote, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethodType = 'card' | 'direct';

interface PaymentMethodTypeSelectorProps {
  selected: PaymentMethodType;
  onSelect: (type: PaymentMethodType) => void;
  disabled?: boolean;
}

interface PaymentOption {
  type: PaymentMethodType;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const paymentOptions: PaymentOption[] = [
  {
    type: 'card',
    icon: <CreditCard className="h-6 w-6" />,
    title: 'Pago con tarjeta',
    description: 'Pago seguro procesado por Onvopay'
  },
  {
    type: 'direct',
    icon: <Banknote className="h-6 w-6" />,
    title: 'Pago directo al proveedor',
    description: 'Pagarás en efectivo o transferencia al proveedor'
  }
];

export const PaymentMethodTypeSelector: React.FC<PaymentMethodTypeSelectorProps> = ({
  selected,
  onSelect,
  disabled = false
}) => {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <h3 className="text-xs font-medium text-muted-foreground mb-3">
          Selecciona el método de pago
        </h3>
        <div className="space-y-2">
          {paymentOptions.map((option) => {
            const isSelected = selected === option.type;
            
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => onSelect(option.type)}
                disabled={disabled}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left",
                  "hover:border-primary/50 hover:bg-muted/30",
                  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-background",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Radio indicator */}
                <div
                  className={cn(
                    "flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground"
                  )}
                >
                  {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                
                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 p-1.5 rounded-md transition-colors",
                    isSelected 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {option.icon}
                </div>
                
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {option.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
