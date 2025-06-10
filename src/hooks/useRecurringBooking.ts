
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
  dayOfWeek?: number;
  dayOfMonth?: number;
  notes?: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  apartment?: string;
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
      const startDate = new Date(data.startTime).toISOString().split('T')[0];
      
      // Si es "once" (una vez), crear una cita normal en lugar de una regla recurrente
      if (data.recurrenceType === 'once') {
        // Obtener proveedor del listing
        const { data: listing } = await supabase
          .from('listings')
          .select('provider_id')
          .eq('id', data.listingId)
          .single();

        if (!listing) {
          throw new Error('No se encontró el servicio');
        }

        const { data: appointment, error } = await supabase
          .from('appointments')
          .insert({
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
            apartment: data.apartment,
            recurrence: 'once',
            external_booking: false,
            is_recurring_instance: false
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating single appointment:', error);
          throw error;
        }

        toast.success('Cita creada exitosamente');
        
        // Invalidar queries para actualizar la UI
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
        
        return appointment;
      }

      // Para citas recurrentes, obtener proveedor y crear la regla recurrente
      const { data: listing } = await supabase
        .from('listings')
        .select('provider_id')
        .eq('id', data.listingId)
        .single();

      if (!listing) {
        throw new Error('No se encontró el servicio');
      }

      const { data: recurringRule, error } = await supabase
        .from('recurring_rules')
        .insert({
          listing_id: data.listingId,
          client_id: user.id,
          provider_id: listing.provider_id,
          recurrence_type: data.recurrenceType,
          start_date: startDate,
          start_time: new Date(data.startTime).toTimeString().split(' ')[0],
          end_time: new Date(data.endTime).toTimeString().split(' ')[0],
          day_of_week: data.dayOfWeek,
          day_of_month: data.dayOfMonth,
          notes: data.notes || '',
          client_address: data.clientAddress,
          client_phone: data.clientPhone,
          client_email: data.clientEmail,
          apartment: data.apartment,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating recurring rule:', error);
        throw error;
      }

      console.log('Recurring rule created successfully:', recurringRule);

      // Generar inmediatamente las instancias para las próximas 10 semanas
      try {
        console.log('Generating initial instances for recurring rule:', recurringRule.id);
        
        const { data: generatedCount, error: generateError } = await supabase.rpc(
          'generate_recurring_appointment_instances',
          {
            p_rule_id: recurringRule.id,
            p_weeks_ahead: 10
          }
        );

        if (generateError) {
          console.error('Error generating initial instances:', generateError);
          // No fallar la creación por esto, solo advertir
          toast.error('Regla creada pero hubo un problema generando las citas futuras');
        } else {
          console.log(`Successfully generated ${generatedCount || 0} initial instances`);
        }
      } catch (generateError) {
        console.error('Exception generating initial instances:', generateError);
      }

      // Invalidar queries para actualizar la UI
      queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['all-recurring-rules'] });

      toast.success('Servicio recurrente creado exitosamente. Las citas se han programado automáticamente.');
      return recurringRule;
      
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
