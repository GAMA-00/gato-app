
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildCompleteLocation } from '@/utils/locationBuilder';

export interface ClientBooking {
  id: string;
  serviceName: string;
  subcategory: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected' | 'rescheduled';
  recurrence: string;
  providerId: string;
  providerName: string;
  isRated: boolean;
  location: string;
  isRescheduled?: boolean;
  originalRecurrenceGroupId?: string;
  listingId?: string;
  recurrenceGroupId?: string;
  isRecurringInstance?: boolean;
  originalAppointmentId?: string;
}

export const useClientBookings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-bookings', user?.id],
    queryFn: async (): Promise<ClientBooking[]> => {
      if (!user?.id) return [];

      console.log('=== CLIENT BOOKINGS QUERY START ===');
      console.log('Fetching client bookings for user:', user.id);

      try {
        // Get basic appointments data
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            end_time,
            status,
            recurrence,
            provider_id,
            client_id,
            apartment,
            external_booking,
            client_address,
            listing_id,
            recurrence_group_id,
            notes,
            is_recurring_instance,
            provider_name,
            client_name
          `)
          .eq('client_id', user.id)
          .in('status', ['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'rescheduled'])
          .order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching appointments:', error);
          throw error;
        }

        if (!appointments?.length) {
          console.log('No appointments found for client');
          return [];
        }

        console.log(`Found ${appointments.length} appointments`);

        // Get service information
        const listingIds = [...new Set(appointments.map(a => a.listing_id).filter(Boolean))];
        let servicesMap = new Map();

        if (listingIds.length > 0) {
          try {
            const { data: listings } = await supabase
              .from('listings')
              .select(`
                id,
                title,
                service_type_id,
                service_types(name)
              `)
              .in('id', listingIds);

            if (listings) {
              servicesMap = new Map(listings.map(l => [l.id, l]));
            }
          } catch (error) {
            console.error('Error fetching services:', error);
          }
        }

        // Get provider information
        const providerIds = [...new Set(appointments.map(a => a.provider_id).filter(Boolean))];
        let providersMap = new Map();

        if (providerIds.length > 0) {
          try {
            const { data: providers } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIds);

            if (providers) {
              providersMap = new Map(providers.map(p => [p.id, p]));
            }
          } catch (error) {
            console.error('Error fetching providers:', error);
          }
        }

        // Get rated appointments
        const appointmentIds = appointments.map(a => a.id);
        let ratedIds = new Set();

        try {
          const { data: ratedAppointments } = await supabase
            .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

          if (ratedAppointments) {
            ratedIds = new Set(ratedAppointments.map((r: any) => r.appointment_id));
          }
        } catch (error) {
          console.error('Error fetching ratings:', error);
        }

        // CRITICAL: Get current user data with ALL location fields
        console.log('=== FETCHING COMPLETE USER LOCATION DATA ===');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            house_number,
            condominium_text,
            condominium_name,
            residencia_id,
            residencias (
              id,
              name
            )
          `)
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
        }

        console.log('=== COMPLETE USER LOCATION DATA ===');
        console.log('Full user data object:', JSON.stringify(userData, null, 2));
        console.log('Residencia name:', userData?.residencias?.name);
        console.log('Condominium text:', userData?.condominium_text);  
        console.log('Condominium name:', userData?.condominium_name);
        console.log('House number:', userData?.house_number);

        // Process appointments with enhanced location building
        const processedBookings = appointments.map(appointment => {
          const service = servicesMap.get(appointment.listing_id);
          const provider = providersMap.get(appointment.provider_id);
          
          // Build location string using buildCompleteLocation utility
          let location = 'Ubicación no especificada';
          
          console.log(`=== PROCESSING APPOINTMENT ${appointment.id} ===`);
          
          if (appointment.external_booking && appointment.client_address) {
            console.log('External booking detected, using client address');
            location = buildCompleteLocation({
              clientAddress: appointment.client_address,
              isExternal: true
            }, appointment.id);
          } else if (userData) {
            console.log('Building internal location with COMPLETE user data');
            console.log('Data being passed to buildCompleteLocation:', {
              residenciaName: userData.residencias?.name,
              condominiumText: userData.condominium_text,
              condominiumName: userData.condominium_name,  
              houseNumber: userData.house_number,
              apartment: appointment.apartment,
              isExternal: false
            });
            
            location = buildCompleteLocation({
              residenciaName: userData.residencias?.name,
              condominiumText: userData.condominium_text,  // CRITICAL: Use condominium_text first
              condominiumName: userData.condominium_name,  // Fallback
              houseNumber: userData.house_number,
              apartment: appointment.apartment,
              isExternal: false
            }, appointment.id);
          } else {
            console.log('⚠️ NO USER DATA AVAILABLE for location building');
          }

          console.log(`Final location for appointment ${appointment.id}:`, location);

          const result: ClientBooking = {
            id: appointment.id,
            serviceName: service?.title || 'Servicio',
            subcategory: service?.service_types?.name || 'Servicio',
            date: new Date(appointment.start_time),
            status: appointment.status as ClientBooking['status'],
            recurrence: appointment.recurrence || 'none',
            providerId: appointment.provider_id,
            providerName: provider?.name || appointment.provider_name || 'Proveedor',
            isRated: ratedIds.has(appointment.id),
            location,
            isRescheduled: appointment.notes?.includes('Reagendado'),
            originalRecurrenceGroupId: appointment.recurrence_group_id,
            listingId: appointment.listing_id,
            recurrenceGroupId: appointment.recurrence_group_id,
            isRecurringInstance: appointment.is_recurring_instance || false,
            originalAppointmentId: appointment.is_recurring_instance ? appointment.id.split('-recurring-')[0] : undefined
          };

          return result;
        });

        console.log('=== FINAL PROCESSED BOOKINGS ===');
        console.log(`Processed ${processedBookings.length} bookings with locations:`);
        processedBookings.forEach(booking => {
          console.log(`Booking ${booking.id}: "${booking.location}"`);
        });
        
        return processedBookings;

      } catch (error) {
        console.error('Error in useClientBookings:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
  });
};
