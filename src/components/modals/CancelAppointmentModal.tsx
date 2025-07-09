/**
 * MODAL DE CANCELACIÓN CONSOLIDADO
 * ================================
 * 
 * Modal especializado para cancelar citas usando el sistema base
 */

import React from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { BaseBookingModal, useModalLoading, BaseModalAction } from './BaseBookingModal';

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
      
      // Auto-limpiar todas las citas canceladas de la serie
      setTimeout(async () => {
        try {
          await supabase
            .from('appointments')
            .delete()
            .eq('provider_id', appointment.provider_id)
            .eq('client_id', appointment.client_id)
            .eq('listing_id', appointment.listing_id)
            .eq('status', 'cancelled');
          
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

  const actions: BaseModalAction[] = [
    {
      label: isRecurring ? 'Cancelar solo esta cita' : 'Cancelar cita',
      onClick: handleCancelSingle,
      variant: 'outline',
      icon: X,
      className: 'text-red-600 border-red-200 hover:bg-red-50'
    },
    ...(isRecurring ? [{
      label: 'Cancelar todas las citas futuras',
      onClick: handleCancelRecurring,
      variant: 'outline' as const,
      icon: Calendar,
      className: 'text-red-600 border-red-200 hover:bg-red-50'
    }] : [])
  ];

  const description = isRecurring 
    ? 'Esta es una cita recurrente. ¿Qué deseas cancelar?'
    : '¿Estás seguro de que deseas cancelar esta cita?';

  // ===== RENDER =====

  return (
    <BaseBookingModal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancelar Cita"
      description={description}
      icon={X}
      iconColor="text-red-500"
      actions={actions}
      isLoading={isLoading}
    />
  );
};