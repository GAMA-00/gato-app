
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRecurringAppointments } from './useRecurringAppointments';
import { buildLocationString, LocationData } from '@/utils/locationUtils';
import { startOfDay, endOfDay, addMonths, subMonths } from 'date-fns';

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

      console.log('=== FETCHING CLIENT BOOKINGS WITH RECURRING ===');
      console.log('Fetching client bookings for user:', user.id);

      try {
        // Get appointments with basic data including rescheduled ones
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
            residencia_id,
            external_booking,
            client_address,
            listing_id,
            recurrence_group_id,
            notes,
            is_recurring_instance
          `)
          .eq('client_id', user.id)
          .in('status', ['pending', 'confirmed', 'completed', 'cancelled', 'rejected', 'rescheduled'])
          .order('start_time', { ascending: false });

        if (error) {
          console.error('Error fetching client bookings:', error);
          throw error;
        }

        if (!appointments?.length) {
          console.log('No appointments found for client');
          return [];
        }

        console.log(`Found ${appointments.length} appointments for client`);

        // Separate regular and recurring appointments
        const regularAppointments = appointments.filter(app => 
          !app.recurrence || app.recurrence === 'none' || app.status === 'completed'
        );
        
        const recurringBaseAppointments = appointments.filter(app => 
          app.recurrence && 
          app.recurrence !== 'none' && 
          app.status !== 'completed' &&
          app.status !== 'cancelled'
        );

        console.log(`Regular appointments: ${regularAppointments.length}`);
        console.log(`Recurring base appointments: ${recurringBaseAppointments.length}`);

        // Generate recurring instances for a wider range to include past appointments
        const startDate = startOfDay(subMonths(new Date(), 6)); // 6 months back
        const endDate = endOfDay(addMonths(new Date(), 6)); // 6 months forward

        const recurringInstances = useRecurringAppointments({
          recurringAppointments: recurringBaseAppointments,
          startDate,
          endDate
        });

        console.log(`Generated ${recurringInstances.length} recurring instances`);

        // Combine all appointments for processing
        const allAppointmentsForProcessing = [
          ...regularAppointments,
          ...recurringInstances
        ];

        // Get unique listing IDs to fetch service information
        const listingIds = [...new Set(allAppointmentsForProcessing.map(a => a.listing_id).filter(Boolean))];
        let listingsMap = new Map();

        if (listingIds.length > 0) {
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
            listingsMap = new Map(listings.map(l => [l.id, l]));
          }
        }

        // Get unique provider IDs to fetch provider information
        const providerIds = [...new Set(allAppointmentsForProcessing.map(a => a.provider_id).filter(Boolean))];
        let providersMap = new Map();

        if (providerIds.length > 0) {
          const { data: providers } = await supabase
            .from('users')
            .select(`
              id,
              name,
              house_number,
              residencia_id,
              condominium_name,
              condominium_id
            `)
            .in('id', providerIds);

          if (providers) {
            providersMap = new Map(providers.map(p => [p.id, p]));
          }
        }

        // Get unique residencia IDs for batch fetching
        const residenciaIds = [...new Set(
          allAppointmentsForProcessing
            .map(a => a.residencia_id || providersMap.get(a.provider_id)?.residencia_id)
            .filter(Boolean)
        )];
        
        let residenciasMap = new Map();
        if (residenciaIds.length > 0) {
          const { data: residencias } = await supabase
            .from('residencias')
            .select('id, name, address')
            .in('id', residenciaIds);
          
          if (residencias) {
            residenciasMap = new Map(residencias.map(r => [r.id, r]));
          }
        }

        // Get unique condominium IDs for batch fetching
        const condominiumIds = [...new Set(
          allAppointmentsForProcessing
            .map(a => providersMap.get(a.provider_id)?.condominium_id)
            .filter(id => id && !id.startsWith('static-'))
        )];

        let condominiumsMap = new Map();
        if (condominiumIds.length > 0) {
          const { data: condominiums } = await supabase
            .from('condominiums')
            .select('id, name')
            .in('id', condominiumIds);
          
          if (condominiums) {
            condominiumsMap = new Map(condominiums.map(c => [c.id, c]));
          }
        }

        // Get rated appointments - include both regular and recurring instance IDs
        const appointmentIds = allAppointmentsForProcessing.map(a => a.id);
        const { data: ratedAppointments } = await supabase
          .rpc('get_rated_appointments', { appointment_ids: appointmentIds });

        const ratedIds = new Set(ratedAppointments?.map((r: any) => r.appointment_id) || []);

        console.log('Processing appointments with complete data...');

        // Filter out rescheduled appointments that should be hidden from main view
        const visibleAppointments = allAppointmentsForProcessing.filter(appointment => {
          if (appointment.status === 'rescheduled' && 
              appointment.recurrence !== 'none' && 
              appointment.is_recurring_instance) {
            return false;
          }
          return true;
        });

        const processedBookings = visibleAppointments.map(appointment => {
          const listing = listingsMap.get(appointment.listing_id);
          const provider = providersMap.get(appointment.provider_id);
          
          // Prepare location data for the utility function
          const residenciaId = appointment.residencia_id || provider?.residencia_id;
          const residencia = residenciasMap.get(residenciaId);
          const condominiumId = provider?.condominium_id;
          const condominium = condominiumsMap.get(condominiumId);
          
          const locationData: LocationData = {
            residenciaName: residencia?.name,
            condominiumName: condominium?.name || provider?.condominium_name,
            houseNumber: provider?.house_number,
            apartment: appointment.apartment,
            clientAddress: appointment.client_address,
            isExternal: appointment.external_booking
          };

          const locationString = buildLocationString(locationData);

          // Check if this appointment is a rescheduled instance
          const isRescheduled = appointment.recurrence_group_id && 
                               appointment.recurrence === 'none' &&
                               appointment.notes?.includes('Reagendado desde cita recurrente');

          // Determine if this is a recurring instance
          const isRecurringInstance = appointment.is_recurring_instance || 
                                    (appointment.recurrence && appointment.recurrence !== 'none');

          const result: ClientBooking = {
            id: appointment.id,
            serviceName: listing?.title || 'Servicio',
            subcategory: listing?.service_types?.name || 'Servicio',
            date: new Date(appointment.start_time),
            status: appointment.status as ClientBooking['status'],
            recurrence: appointment.recurrence || 'none',
            providerId: appointment.provider_id,
            providerName: provider?.name || 'Proveedor',
            isRated: ratedIds.has(appointment.id),
            location: locationString,
            isRescheduled,
            originalRecurrenceGroupId: appointment.recurrence_group_id,
            listingId: appointment.listing_id,
            recurrenceGroupId: appointment.recurrence_group_id,
            isRecurringInstance,
            originalAppointmentId: isRecurringInstance ? appointment.id.split('-recurring-')[0] : undefined
          };

          console.log(`Processed booking ${appointment.id}:`, {
            serviceName: result.serviceName,
            providerName: result.providerName,
            location: result.location,
            status: result.status,
            isRecurringInstance: result.isRecurringInstance,
            isRescheduled: result.isRescheduled
          });

          return result;
        });

        console.log(`=== CLIENT BOOKINGS PROCESSING COMPLETE ===`);
        console.log(`Total processed bookings: ${processedBookings.length}`);
        console.log(`Recurring instances: ${processedBookings.filter(b => b.isRecurringInstance).length}`);
        console.log(`Regular appointments: ${processedBookings.filter(b => !b.isRecurringInstance).length}`);

        return processedBookings;

      } catch (error) {
        console.error('Error in useClientBookings:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });
};
