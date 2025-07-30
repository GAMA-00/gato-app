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
  });

  const handleCancelRecurring = () => withLoading(async () => {
    console.log('Canceling recurring appointment series:', appointmentId);
    
    // Obtener detalles de la cita
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Cancelar la cita base
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        recurrence: 'none',
        status: 'cancelled',
        cancellation_time: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) throw updateError;

    // Cancelar todas las citas futuras con el mismo patrón
    if (appointment.recurrence && appointment.recurrence !== 'none') {
      const { error: cancelFutureError } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_time: new Date().toISOString()
        })
        .eq('provider_id', appointment.provider_id)
        .eq('client_id', appointment.client_id)
        .eq('listing_id', appointment.listing_id)
        .eq('recurrence', appointment.recurrence)
        .gte('start_time', new Date().toISOString())
        .neq('id', appointmentId);

      if (cancelFutureError) {
        console.error('Error canceling future appointments:', cancelFutureError);
      }
      
      // Auto-limpiar solo las citas canceladas de esta serie específica
      setTimeout(async () => {
        try {
          // Solo eliminar citas de la misma serie recurrente usando criterios más específicos
          await supabase
            .from('appointments')
            .delete()
            .eq('status', 'cancelled')
            .eq('recurrence', appointment.recurrence)
            .eq('provider_id', appointment.provider_id)
            .eq('client_id', appointment.client_id)
            .eq('listing_id', appointment.listing_id)
            .gte('start_time', appointment.start_time); // Solo citas de esta serie (misma fecha o posteriores)
          
          queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        } catch (deleteError) {
          console.warn('Could not auto-clean cancelled recurring appointments:', deleteError);
        }
      }, 3000);
    }

    toast.success('Serie de citas recurrentes cancelada exitosamente');
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    onClose();
  });

  // ===== CONFIGURACIÓN DEL MODAL =====

  const description = isRecurring 
    ? 'Esta es una cita recurrente. ¿Qué deseas cancelar?'
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
            className="w-full justify-start gap-2 text-red-600 border-red-200 hover:bg-red-50 border-2"
          >
            <X className="h-4 w-4" />
            {isRecurring ? 'Cancelar solo esta cita' : 'Cancelar cita'}
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