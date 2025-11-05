import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { RobustBookingSystem } from '@/utils/robustBookingSystem';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface RobustBookingButtonProps {
  bookingData: {
    listingId: string;
    startTime: string;
    endTime: string;
    recurrenceType: string;
    notes?: string;
    clientAddress?: string;
    clientPhone?: string;
    clientEmail?: string;
    customVariableSelections?: any;
    customVariablesTotalPrice?: number;
  };
  onSuccess?: (appointment: any) => void;
  disabled?: boolean;
  className?: string;
}

export function RobustBookingButton({ 
  bookingData, 
  onSuccess, 
  disabled, 
  className 
}: RobustBookingButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const { createRecurringBooking } = useRecurringBooking();

  const handleBooking = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setAttemptCount(0);

    try {
      console.log('🚀 Iniciando proceso de reserva robusto');
      
      const result = await RobustBookingSystem.createBooking(
        async () => {
          setAttemptCount(prev => prev + 1);
          return await createRecurringBooking(bookingData);
        },
        {
          maxAttempts: 3,
          showProgress: true,
          optimisticValidation: true
        }
      );

      if (result.success && result.data) {
        console.log('✅ Reserva creada exitosamente:', result.data);
        onSuccess?.({
          ...result.data,
          bookingType: bookingData.recurrenceType !== 'once' ? 'recurring' : 'once'
        });
      } else {
        console.error('❌ Error en reserva:', result.error);
        toast.error(result.error || 'No se pudo crear la reserva', {
          duration: 5000,
          icon: <AlertCircle className="h-4 w-4" />,
          action: {
            label: 'Ver mis citas',
            onClick: () => window.location.href = '/client/bookings'
          }
        });
      }
    } catch (error: any) {
      console.error('💥 Error inesperado en booking:', error);
      toast.error('Error inesperado. Por favor intenta de nuevo.', {
        duration: 5000,
        icon: <AlertCircle className="h-4 w-4" />
      });
    } finally {
      setIsProcessing(false);
      setAttemptCount(0);
    }
  };

  return (
    <Button
      onClick={handleBooking}
      disabled={disabled || isProcessing}
      className={className}
      size="lg"
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {attemptCount > 1 ? `Reintentando (${attemptCount}/3)...` : 'Confirmando reserva...'}
        </>
      ) : (
        'Confirmar Reserva'
      )}
    </Button>
  );
}