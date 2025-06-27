
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface RecurringBookingData {
  listingId: string;
  startTime: string;
  endTime: string;
  recurrenceType: string;
  notes?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export function useRecurringBooking() {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createRecurringBooking = async (data: RecurringBookingData) => {
    if (!user) {
      toast.error('Debe estar autenticado para crear una cita');
      return null;
    }

    setIsLoading(true);

    try {
      // Obtener información del servicio
      const { data: listing } = await supabase
        .from('listings')
        .select('provider_id, title')
        .eq('id', data.listingId)
        .single();

      if (!listing) {
        throw new Error('No se encontró el servicio');
      }

      // Crear la cita directamente en appointments con el campo recurrence
      const appointmentData = {
        listing_id: data.listingId,
        client_id: user.id,
        provider_id: listing.provider_id,
        start_time: data.startTime,
        end_time: data.endTime,
        status: 'pending',
        notes: data.notes || '',
        client_address: data.clientAddress,
        client_phone: data.clientPhone,
        client_email: data.clientEmail,
        client_name: user.name || 'Cliente',
        recurrence: data.recurrenceType,
        external_booking: false,
        is_recurring_instance: data.recurrenceType !== 'once'
      };

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw error;
      }

      if (data.recurrenceType === 'once') {
        toast.success('Cita creada exitosamente');
      } else {
        toast.success(`Servicio recurrente ${data.recurrenceType} creado exitosamente.`);
      }

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });

      return appointment;
      
    } catch (error: any) {
      console.error('Error in createRecurringBooking:', error);
      toast.error('Error al crear la cita: ' + (error.message || 'Error desconocido'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createRecurringBooking,
    isLoading
  };
}
