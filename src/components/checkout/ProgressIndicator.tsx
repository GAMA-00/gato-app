import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  step: 1 | 2;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ step }) => {
  const progress = step === 1 ? 50 : 100;
  const stepText = step === 1 ? 'Resumen de tu Reserva' : 'Método de Pago';

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted-foreground">
          Paso {step} de 2
        </span>
        <span className="font-semibold">{stepText}</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};
