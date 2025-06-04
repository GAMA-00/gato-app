
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, addMonths, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface RecurringBookingData {
  providerId: string;
  listingId: string;
  startTime: Date;
  recurrence: 'weekly' | 'biweekly' | 'monthly' | 'daily';
  notes?: string;
  residencia?: string;
  apartment?: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
  client_name?: string;
  is_external?: boolean;
}

// Function to generate recurring appointments
const generateRecurringAppointments = (bookingData: RecurringBookingData) => {
  const { startTime, recurrence } = bookingData;
  const startDate = new Date(startTime);
  const appointments = [];

  for (let i = 0; i < 8; i++) {
    let newDate = new Date(startDate);

    switch (recurrence) {
      case 'weekly':
        newDate = addWeeks(startDate, i);
        break;
      case 'biweekly':
        newDate = addWeeks(startDate, i * 2);
        break;
      case 'monthly':
        newDate = addMonths(startDate, i);
        break;
      case 'daily':
        newDate = addDays(startDate, i);
        break;
      default:
        break;
    }

    const formattedDate = format(newDate, 'yyyy-MM-dd');
    const formattedTime = format(new Date(startTime), 'HH:mm:ss');
    const startDateTime = `${formattedDate} ${formattedTime}`;

    // Calculate end time based on service duration (assuming 1 hour default)
    const endTime = new Date(startDateTime);
    endTime.setHours(endTime.getHours() + 1);
    const endDateTime = format(endTime, 'yyyy-MM-dd HH:mm:ss');

    appointments.push({
      provider_id: bookingData.providerId,
      listing_id: bookingData.listingId,
      start_time: startDateTime,
      end_time: endDateTime,
      recurrence: bookingData.recurrence,
      notes: bookingData.notes,
      residencia: bookingData.residencia,
      apartment: bookingData.apartment,
      client_address: bookingData.client_address,
      client_phone: bookingData.client_phone,
      client_email: bookingData.client_email,
      client_name: bookingData.client_name,
      external_booking: bookingData.is_external || false
    });
  }

  return appointments;
};

export const useRecurringBooking = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth(); // Move useAuth to the top level

  const createRecurringBooking = useCallback(async (bookingData: RecurringBookingData) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating recurring booking with data:', bookingData);

      // Validate required fields
      if (!bookingData.providerId || !bookingData.listingId || !bookingData.startTime || !bookingData.recurrence) {
        throw new Error('Faltan campos requeridos para la reserva');
      }

      // Generate appointments based on recurrence
      const appointments = generateRecurringAppointments(bookingData);
      
      if (appointments.length === 0) {
        throw new Error('No se pudieron generar las citas recurrentes');
      }

      console.log(`Generated ${appointments.length} recurring appointments`);

      // Generate a single group ID for all appointments in this recurring series
      const recurrenceGroupId = crypto.randomUUID();

      // Insert all appointments with the same recurrence_group_id
      const appointmentsToInsert = appointments.map(apt => ({
        ...apt,
        recurrence_group_id: recurrenceGroupId,
        client_id: user.id,
        status: 'pending' as const,
        created_at: new Date().toISOString()
      }));

      console.log('Inserting appointments with group ID:', recurrenceGroupId);
      console.log('Appointments to insert:', appointmentsToInsert);

      const { data: insertedAppointments, error } = await supabase
        .from('appointments')
        .insert(appointmentsToInsert)
        .select();

      if (error) {
        console.error('Error inserting recurring appointments:', error);
        throw new Error(`Error al crear las citas recurrentes: ${error.message}`);
      }

      console.log('Successfully created recurring appointments:', insertedAppointments);

      return {
        success: true,
        appointments: insertedAppointments,
        groupId: recurrenceGroupId,
        count: insertedAppointments?.length || 0
      };

    } catch (error) {
      console.error('Error creating recurring booking:', error);
      setError(error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Add user as dependency

  return {
    isLoading,
    error,
    createRecurringBooking
  };
};
