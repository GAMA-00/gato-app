import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface StickyPaymentFooterProps {
  amount: number;
  isProcessing: boolean;
  hasSubmitted: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const StickyPaymentFooter: React.FC<StickyPaymentFooterProps> = ({
  amount,
  isProcessing,
  hasSubmitted,
  onSubmit
}) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border py-4 px-6 -mx-6 mt-8 shadow-lg">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(amount)}
          </span>
        </div>
        
        {/* Botón de pago */}
        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isProcessing || hasSubmitted}
          onClick={onSubmit}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              Confirmar y Pagar {formatCurrency(amount)}
            </>
          )}
        </Button>
        
        {/* Mensaje de seguridad */}
        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Pago seguro encriptado
        </p>
      </div>
    </div>
  );
};
