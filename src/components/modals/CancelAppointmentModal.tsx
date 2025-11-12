/**
 * MODAL DE CANCELACIÓN CONSOLIDADO
 * ================================
 * 
 * Modal especializado para cancelar citas usando el sistema base
 */

import React, { useRef } from 'react';
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
import { logger } from '@/utils/logger';

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
  const isProcessing = useRef(false);

  // ===== FUNCIONES DE CANCELACIÓN =====

  const handleCancelSingle = () => withLoading(async () => {
    // Prevenir ejecuciones duplicadas
    if (isProcessing.current) {
      logger.warn('Operación ya en proceso, ignorando click duplicado');
      return;
    }

    isProcessing.current = true;

    try {
      if (isRecurring) {
        // Para citas recurrentes: usar la nueva función para saltar solo esta instancia
        logger.systemOperation('Skipping recurring instance using edge function:', appointmentId);
        
        // Toast inmediato para feedback
        toast.loading('Saltando cita...', { id: 'skip-appointment' });

        const { data, error } = await supabase.functions.invoke('skip-recurring-instance', {
          body: { appointmentId }
        });

        if (error) {
          logger.error('Edge function error:', { error, appointmentId });
          toast.dismiss('skip-appointment');
          throw new Error(error.message || 'Failed to skip recurring instance');
        }

        if (!data?.success) {
          toast.dismiss('skip-appointment');
          throw new Error(data?.error || 'Failed to skip recurring instance');
        }

        logger.info('Successfully skipped recurring instance:', { data });
        toast.success('Próxima cita mostrada', { id: 'skip-appointment' });
        
        // Invalidación optimizada con refetch solo de queries activas
        await Promise.all([
          queryClient.invalidateQueries({ 
            queryKey: ['unified-recurring-appointments'],
            refetchType: 'active'
          }),
          queryClient.invalidateQueries({ 
            queryKey: ['client-bookings'],
            refetchType: 'active'
          }),
          queryClient.invalidateQueries({ queryKey: ['appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        ]);
        
        onClose();
      } else {
        // Para citas no recurrentes: usar función atómica
        logger.info('Canceling single appointment atomically:', { appointmentId });
        
        // Toast inmediato para feedback
        toast.loading('Cancelando cita...', { id: 'cancel-appointment' });
        
        const { data, error } = await supabase
          .rpc('cancel_appointment_atomic', {
            p_appointment_id: appointmentId,
            p_cancel_future: false,
            p_reason: 'user_cancelled',
            p_cancelled_by: null // Uses auth.uid()
          });

        if (error) {
          logger.error('Error canceling appointment:', { error, appointmentId });
          toast.dismiss('cancel-appointment');
          throw error;
        }

        logger.info('Appointment cancelled:', { data });
        toast.success('Cita cancelada', { id: 'cancel-appointment' });
        
        // Invalidate all relevant queries with optimized refetch
        await Promise.all([
          queryClient.invalidateQueries({ 
            queryKey: ['client-bookings'],
            refetchType: 'active'
          }),
          queryClient.invalidateQueries({ queryKey: ['appointments'] }),
          queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
        ]);
        
        onClose();
      }
    } catch (error) {
      logger.error('Error in cancel/skip operation:', { error, appointmentId });
      toast.error(error instanceof Error ? error.message : 'Error al procesar la solicitud');
      throw error;
    } finally {
      isProcessing.current = false;
    }
  });

  const handleCancelRecurring = () => withLoading(async () => {
    // Prevenir ejecuciones duplicadas
    if (isProcessing.current) {
      logger.warn('Operación ya en proceso, ignorando click duplicado');
      return;
    }

    isProcessing.current = true;

    try {
      logger.info('Canceling recurring appointment series using edge function:', { appointmentId });
      
      // Toast inmediato para feedback
      toast.loading('Cancelando plan recurrente...', { id: 'cancel-series' });

      // Use the secure edge function to cancel the entire recurring series
      const { data, error } = await supabase.functions.invoke('cancel-recurring-series', {
        body: { appointmentId }
      });

      if (error) {
        logger.error('Edge function error:', { error, appointmentId });
        toast.dismiss('cancel-series');
        throw new Error(error.message || 'Failed to cancel recurring series');
      }

      if (!data?.success) {
        toast.dismiss('cancel-series');
        throw new Error(data?.error || 'Failed to cancel recurring series');
      }

      logger.info('Successfully cancelled recurring series:', { data });
      
      toast.success('Plan recurrente cancelado', { id: 'cancel-series' });
      
      // Invalidación optimizada con refetch solo de queries activas
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['unified-recurring-appointments'],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['client-bookings'],
          refetchType: 'active'
        }),
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['recurring-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['weekly-slots'] }),
        queryClient.resetQueries({ queryKey: ['client-bookings'] })
      ]);
      
      onClose();
    } catch (error) {
      logger.error('Error cancelling recurring series:', { error, appointmentId });
      toast.error(error instanceof Error ? error.message : 'Error al cancelar la serie de citas');
      throw error;
    } finally {
      isProcessing.current = false;
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