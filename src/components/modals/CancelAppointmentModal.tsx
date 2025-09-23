/**
 * MODAL DE CANCELACIÓN CONSOLIDADO
 * ================================
 * 
 * Modal especializado para cancelar citas usando el sistema base
 */

import React from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useModalLoading } from './BaseBookingModal';

// ===== TIPOS =====

export interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: string;
  isRecurring: boolean;
  appointmentDate: Date;
}

// ===== COMPONENTE PRINCIPAL =====

export const CancelAppointmentModal = ({
  isOpen,
  onClose,
  appointmentId,
  isRecurring,
  appointmentDate
}: CancelAppointmentModalProps) => {
  const { isLoading, withLoading } = useModalLoading();
  const queryClient = useQueryClient();

  // ===== FUNCIONES DE CANCELACIÓN =====

  const handleCancelSingle = () => withLoading(async () => {
    if (isRecurring) {
      // Para citas recurrentes: usar la nueva función para saltar solo esta instancia
      console.log('🔄 Skipping recurring instance using edge function:', appointmentId);
      
      try {
        const { data, error } = await supabase.functions.invoke('skip-recurring-instance', {
          body: { appointmentId }
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          throw new Error(error.message || 'Failed to skip recurring instance');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to skip recurring instance');
        }

        console.log('✅ Successfully skipped recurring instance:', data);
        toast.success('Se saltó esta fecha. Verás la siguiente instancia de la serie.');
        
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
          queryClient.invalidateQueries({ queryKey: ['appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        ]);
        
        // Force refetch after a short delay
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['client-bookings'] });
        }, 500);
        
        onClose();
      } catch (error) {
        console.error('❌ Error skipping recurring instance:', error);
        toast.error(error instanceof Error ? error.message : 'Error al saltar la cita');
        throw error;
      }
    } else {
      // Para citas no recurrentes: cancelar normalmente
      console.log('Canceling single appointment:', appointmentId);
      
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_time: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // Auto-limpiar la cita cancelada después de 3 segundos
      setTimeout(async () => {
        try {
          await supabase
            .from('appointments')
            .delete()
            .eq('id', appointmentId)
            .eq('status', 'cancelled');
          
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        } catch (deleteError) {
          console.warn('Could not auto-clean cancelled appointment:', deleteError);
        }
      }, 3000);

      toast.success('Cita cancelada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      onClose();
    }
  });

  const handleCancelRecurring = () => withLoading(async () => {
    console.log('🚫 Canceling recurring appointment series using edge function:', appointmentId);
    
    try {
      // Use the secure edge function to cancel the entire recurring series
      const { data, error } = await supabase.functions.invoke('cancel-recurring-series', {
        body: { appointmentId }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to cancel recurring series');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to cancel recurring series');
      }

      console.log('✅ Successfully cancelled recurring series:', data);
      
      toast.success(`Serie de citas recurrentes cancelada (${data.cancelledCount || 0} citas)`);
      
      // Invalidate ALL possible query keys to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.resetQueries({ queryKey: ['client-bookings'] })
      ]);
      
      // Force a complete refetch after a short delay
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['client-bookings'] });
      }, 500);
      
      onClose();
    } catch (error) {
      console.error('❌ Error cancelling recurring series:', error);
      toast.error(error instanceof Error ? error.message : 'Error al cancelar la serie de citas');
      throw error;
    }
  });

  // ===== CONFIGURACIÓN DEL MODAL =====

  const description = isRecurring 
    ? 'Esta es una cita recurrente. Puedes saltar solo esta fecha o cancelar toda la serie.'
    : '¿Estás seguro de que deseas cancelar esta cita?';

  // ===== RENDER =====

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <X className="h-5 w-5 text-red-500" />
            Cancelar Cita
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            <Button
            onClick={handleCancelSingle}
            variant="outline"
            disabled={isLoading}
            className={`w-full justify-start gap-2 ${isRecurring ? 'text-blue-600 border-blue-200 hover:bg-blue-50' : 'text-red-600 border-red-200 hover:bg-red-50'} border-2`}
          >
            <X className="h-4 w-4" />
            {isRecurring ? 'Saltar esta cita' : 'Cancelar cita'}
          </Button>

          {isRecurring && (
            <Button
              onClick={handleCancelRecurring}
              variant="outline"
              disabled={isLoading}
              className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50"
            >
              <Calendar className="h-4 w-4" />
              Cancelar todas las citas futuras
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};