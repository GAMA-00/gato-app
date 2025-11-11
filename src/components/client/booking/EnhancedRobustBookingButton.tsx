import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RobustBookingSystem } from '@/utils/robustBookingSystem';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';
import { logger } from '@/utils/logger';

interface EnhancedRobustBookingButtonProps {
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
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedRobustBookingButton({
  bookingData,
  onSuccess,
  disabled,
  className
}: EnhancedRobustBookingButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const { createRecurringBooking } = useRecurringBooking();

  const handleBooking = async () => {
    setIsProcessing(true);
    setAttemptCount(0);

    const isRecurring = bookingData.recurrenceType !== 'once';
    logger.info('Iniciando booking', { 
      isRecurring, 
      recurrenceType: bookingData.recurrenceType,
      listingId: bookingData.listingId
    });

    try {
      const result = await RobustBookingSystem.createBooking(
        async () => {
          setAttemptCount(prev => prev + 1);
          logger.debug('Booking attempt', { 
            attempt: attemptCount + 1, 
            isRecurring,
            recurrenceType: bookingData.recurrenceType
          });
          return await createRecurringBooking(bookingData);
        },
        {
          maxAttempts: isRecurring ? 5 : 3, // More attempts for recurring bookings
          showProgress: true,
          isRecurring: isRecurring
        }
      );

      if (result.success) {
        const recurrenceText = bookingData.recurrenceType === 'weekly' ? 'semanal' : 
                              bookingData.recurrenceType === 'biweekly' ? 'quincenal' : 
                              bookingData.recurrenceType === 'triweekly' ? 'trisemanal' : 
                              bookingData.recurrenceType === 'monthly' ? 'mensual' : 'única';
        
        toast.success(
          isRecurring 
            ? `¡Servicio recurrente ${recurrenceText} confirmado exitosamente!`
            : '¡Cita confirmada exitosamente!',
          { duration: 4000 }
        );
        
        onSuccess?.();
      } else {
        logger.error('Booking failed after all attempts:', { error: result.error });
        toast.error(result.error || 'No se pudo completar la reserva', { duration: 5000 });
      }
    } catch (error) {
      logger.error('Unexpected booking error:', { error });
      toast.error('Error inesperado al procesar la reserva', { duration: 5000 });
    } finally {
      setIsProcessing(false);
      setAttemptCount(0);
    }
  };

  const getButtonText = () => {
    if (!isProcessing) {
      return bookingData.recurrenceType === 'once' 
        ? 'Confirmar Reserva' 
        : `Confirmar Servicio Recurrente`;
    }

    if (attemptCount > 1) {
      return `Reintentando... (${attemptCount}/5)`;
    }

    return bookingData.recurrenceType === 'once' 
      ? 'Procesando...' 
      : 'Configurando recurrencia...';
  };

  return (
    <Button
      onClick={handleBooking}
      disabled={disabled || isProcessing}
      className={className}
      size="lg"
    >
      {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {getButtonText()}
    </Button>
  );
}