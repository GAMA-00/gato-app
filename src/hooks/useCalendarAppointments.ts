import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { getAppointmentRescheduleInfo } from '@/utils/simplifiedRecurrenceUtils';

interface AppointmentData {
  id: string;
  provider_id: string;
  client_id: string | null;
  listing_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_name: string | null;
  provider_name: string | null;
  external_booking: boolean;
  is_recurring_instance: boolean;
  recurring_rule_id: string | null;
  recurrence: string | null;
  created_at: string;
}

interface EnhancedAppointment extends AppointmentData {
  listings: {
    title: string;
    service_type_id: string;
    service_types: {
      name: string;
    };
  } | null;
  users: {
    name: string;
    phone: string;
    email: string;
    condominium_name: string | null;
    house_number: string | null;
  } | null;
  residencias: null;
  complete_location: string;
  rescheduled_style?: string;
  reschedule_notes?: string;
  is_rescheduled_appointment?: boolean;
}

export const useCalendarAppointments = (currentDate: Date) => {
  const { user } = useAuth();
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  return useQuery({
    queryKey: ['calendar-appointments', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<EnhancedAppointment[]> => {
      if (!user?.id) {
        return [];
      }

      const { data: allAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          provider_id,
          client_id,
          listing_id,
          start_time,
          end_time,
          status,
          notes,
          client_address,
          client_phone,
          client_email,
          client_name,
          provider_name,
          external_booking,
          is_recurring_instance,
          recurring_rule_id,
          recurrence,
          created_at
        `)
        .eq('provider_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        throw new Error(`Error fetching appointments: ${appointmentsError.message}`);
      }

      const appointmentsList = allAppointments || [];

      const allAppointmentIds = appointmentsList.map(apt => apt.id);
      let exceptions: any[] = [];
      
      if (allAppointmentIds.length > 0) {
        const { data: exceptionsData } = await supabase
          .from('recurring_exceptions')
          .select('id, appointment_id, exception_date, action_type, new_start_time, new_end_time, notes, created_at, updated_at')
          .in('appointment_id', allAppointmentIds);
          
        exceptions = exceptionsData || [];
      }

      const rescheduledAppointmentIds = new Set(
        exceptions
          .filter(ex => ex.action_type === 'rescheduled')
          .map(ex => ex.appointment_id)
      );

      const filteredAppointments = appointmentsList.filter(apt => {
        return !rescheduledAppointmentIds.has(apt.id);
      });

      const rescheduledExceptions = exceptions.filter(ex => 
        ex.action_type === 'rescheduled' && ex.new_start_time && ex.new_end_time
      );
      
      for (const exception of rescheduledExceptions) {
        const newStartTime = new Date(exception.new_start_time);
        const newEndTime = new Date(exception.new_end_time);
        
        if (newStartTime >= startDate && newStartTime <= endDate) {
          const originalAppointment = allAppointments.find(apt => apt.id === exception.appointment_id);
          if (originalAppointment) {
            const rescheduledAppointment: AppointmentData = {
              ...originalAppointment,
              id: `${originalAppointment.id}_rescheduled_${exception.id}`,
              start_time: newStartTime.toISOString(),
              end_time: newEndTime.toISOString(),
              notes: exception.notes || originalAppointment.notes,
              is_recurring_instance: true
            };
            
            filteredAppointments.push(rescheduledAppointment);
          }
        }
      }

      const listingIds = [...new Set(appointmentsList.map(apt => apt.listing_id).filter(Boolean))];
      
      let listingsMap: Record<string, any> = {};
      if (listingIds.length > 0) {
        try {
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select(`
              id,
              title,
              service_type_id,
              service_types!inner(name)
            `)
            .in('id', listingIds);

          if (!listingsError && listings) {
            listingsMap = listings.reduce((acc, listing) => {
              acc[listing.id] = {
                title: listing.title,
                service_type_id: listing.service_type_id,
                service_types: listing.service_types
              };
              return acc;
            }, {} as Record<string, any>);
          }
        } catch (listingsError) {
          // Continue without listings
        }
      }

      const clientIds = [...new Set(appointmentsList.map(apt => apt.client_id).filter(Boolean))];
      
      let usersMap: Record<string, any> = {};
      if (clientIds.length > 0) {
        try {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select(`
              id,
              name,
              phone,
              email,
              condominium_name,
              condominium_text,
              house_number,
              residencias (
                id,
                name
              )
            `)
            .in('id', clientIds);

          if (!usersError && users) {
            usersMap = users.reduce((acc, user) => {
              acc[user.id] = {
                name: user.name || '',
                phone: user.phone || '',
                email: user.email || '',
                condominium_name: user.condominium_name,
                condominium_text: user.condominium_text,
                house_number: user.house_number,
                residencias: user.residencias
              };
              return acc;
            }, {} as Record<string, any>);
          }
        } catch (usersError) {
          // Continue without users
        }
      }

      const enhancedAppointments: EnhancedAppointment[] = filteredAppointments
        .map(appointment => {
          const clientUser = appointment.client_id ? usersMap[appointment.client_id] : null;
          
          const completeLocation = buildAppointmentLocation({
            appointment,
            clientData: clientUser
          });

          const isRescheduledAppointment = appointment.id.includes('_rescheduled_');
          let rescheduledStyle = '';
          let rescheduleNotes = '';
          
          if (!isRescheduledAppointment) {
            const appointmentDate = new Date(appointment.start_time);
            const rescheduleInfo = getAppointmentRescheduleInfo(
              {
                id: appointment.id,
                provider_id: appointment.provider_id,
                client_id: appointment.client_id || '',
                start_time: appointment.start_time,
                end_time: appointment.end_time,
                recurrence: appointment.recurrence || 'none',
                status: appointment.status,
                listing_id: appointment.listing_id
              },
              appointmentDate,
              exceptions
            );
            rescheduledStyle = rescheduleInfo.styleClass;
            rescheduleNotes = rescheduleInfo.notes || '';
          }

          return {
            ...appointment,
            listings: listingsMap[appointment.listing_id] || null,
            users: clientUser,
            residencias: clientUser?.residencias || null,
            complete_location: completeLocation,
            rescheduled_style: rescheduledStyle,
            reschedule_notes: rescheduleNotes,
            is_rescheduled_appointment: isRescheduledAppointment
          };
        });

      return enhancedAppointments;
    },
    enabled: !!user?.id,
    staleTime: 60000,
    refetchInterval: 120000,
    retry: (failureCount, error) => {
      return failureCount < 2;
    }
  });
};
