
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, getDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface RecurringBookingData {
  providerId: string;
  listingId: string;
  startTime: Date;
  recurrence: 'weekly' | 'biweekly' | 'monthly';
  notes?: string;
  apartment?: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
  client_name?: string;
  is_external?: boolean;
}

export const useRecurringBooking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const createRecurringRule = useCallback(async (bookingData: RecurringBookingData) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating recurring rule with data:', bookingData);

      // Validar campos requeridos
      if (!bookingData.providerId || !bookingData.listingId || !bookingData.startTime || !bookingData.recurrence) {
        throw new Error('Faltan campos requeridos para la reserva recurrente');
      }

      const startDate = format(bookingData.startTime, 'yyyy-MM-dd');
      const startTime = format(bookingData.startTime, 'HH:mm:ss');
      
      // Calcular end_time basado en duración del servicio (asumiendo 1 hora por defecto)
      const endTime = new Date(bookingData.startTime);
      endTime.setHours(endTime.getHours() + 1);
      const endTimeFormatted = format(endTime, 'HH:mm:ss');

      // Calcular day_of_week o day_of_month según el tipo de recurrencia
      const dayOfWeek = getDay(bookingData.startTime); // 0 = domingo, 1 = lunes, etc.
      const dayOfMonth = bookingData.startTime.getDate();

      const recurringRuleData = {
        provider_id: bookingData.providerId,
        client_id: user.id,
        listing_id: bookingData.listingId,
        start_date: startDate,
        start_time: startTime,
        end_time: endTimeFormatted,
        recurrence_type: bookingData.recurrence,
        day_of_week: ['weekly', 'biweekly'].includes(bookingData.recurrence) ? dayOfWeek : null,
        day_of_month: bookingData.recurrence === 'monthly' ? dayOfMonth : null,
        notes: bookingData.notes,
        apartment: bookingData.apartment,
        client_address: bookingData.client_address,
        client_phone: bookingData.client_phone,
        client_email: bookingData.client_email,
        client_name: bookingData.client_name,
        is_active: true
      };

      console.log('Inserting recurring rule:', recurringRuleData);

      // Crear la regla de recurrencia
      const { data: recurringRule, error: ruleError } = await supabase
        .from('recurring_rules')
        .insert(recurringRuleData)
        .select()
        .single();

      if (ruleError) {
        console.error('Error creating recurring rule:', ruleError);
        throw new Error(`Error al crear la regla de recurrencia: ${ruleError.message}`);
      }

      console.log('Successfully created recurring rule:', recurringRule);

      // Generar las primeras instancias (próximas 16 semanas)
      const endRange = new Date();
      endRange.setDate(endRange.getDate() + (16 * 7)); // 16 semanas
      const endRangeFormatted = format(endRange, 'yyyy-MM-dd');

      const { data: instanceCount, error: generateError } = await supabase
        .rpc('generate_recurring_instances', {
          rule_id: recurringRule.id,
          start_range: startDate,
          end_range: endRangeFormatted
        });

      if (generateError) {
        console.error('Error generating recurring instances:', generateError);
        // No fallar completamente si no se pueden generar las instancias
        console.warn('Could not generate initial instances, but rule was created');
      }

      console.log(`Generated ${instanceCount || 0} recurring instances`);

      return {
        success: true,
        recurringRule,
        instanceCount: instanceCount || 0
      };

    } catch (error) {
      console.error('Error creating recurring booking:', error);
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const cancelRecurringRule = useCallback(async (ruleId: string) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('recurring_rules')
        .update({ is_active: false })
        .eq('id', ruleId);

      if (error) {
        throw new Error(`Error al cancelar la recurrencia: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error canceling recurring rule:', error);
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    isLoading,
    error,
    createRecurringRule,
    cancelRecurringRule
  };
};
