
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export const useCalendarAppointments = (currentDate: Date) => {
  const { user } = useAuth();
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  return useQuery({
    queryKey: ['calendar-appointments', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!user?.id) return [];

      console.log('Fetching calendar appointments for provider:', user.id);
      console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

      // Fetch regular appointments
      const { data: regularAppointments, error: regularError } = await supabase
        .from('appointments')
        .select(`
          *,
          listings!inner(
            title,
            service_type_id,
            service_types(name)
          ),
          users!appointments_client_id_fkey(
            name,
            phone,
            email,
            condominium_name,
            house_number
          ),
          residencias(
            name
          )
        `)
        .eq('provider_id', user.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .in('status', ['pending', 'confirmed', 'completed'])
        .order('start_time', { ascending: true });

      if (regularError) {
        console.error('Error fetching regular appointments:', regularError);
        throw regularError;
      }

      console.log(`Found ${regularAppointments?.length || 0} regular appointments`);

      // Fetch recurring instances
      const { data: recurringInstances, error: recurringError } = await supabase
        .from('recurring_instances')
        .select(`
          *,
          recurring_rules!inner(
            *,
            listings!inner(
              title,
              service_type_id,
              service_types(name)
            )
          )
        `)
        .eq('recurring_rules.provider_id', user.id)
        .gte('instance_date', format(startDate, 'yyyy-MM-dd'))
        .lte('instance_date', format(endDate, 'yyyy-MM-dd'))
        .in('status', ['scheduled', 'confirmed', 'completed'])
        .order('start_time', { ascending: true });

      if (recurringError) {
        console.error('Error fetching recurring instances:', recurringError);
        // Don't throw error for recurring instances, just log and continue
      }

      console.log(`Found ${recurringInstances?.length || 0} recurring instances`);

      // Helper function to safely get listing title
      const getListingTitle = (listings: any) => {
        if (!listings) return 'Servicio';
        if (Array.isArray(listings)) {
          return listings[0]?.title || 'Servicio';
        }
        return listings.title || 'Servicio';
      };

      // Helper function to safely get user name
      const getUserName = (users: any) => {
        if (!users) return null;
        if (typeof users === 'object' && 'name' in users) {
          return users.name;
        }
        return null;
      };

      // Transform recurring instances to match appointment format
      const transformedRecurringInstances = (recurringInstances || []).map(instance => ({
        id: instance.id,
        provider_id: instance.recurring_rules?.provider_id,
        client_id: instance.recurring_rules?.client_id,
        listing_id: instance.recurring_rules?.listing_id,
        start_time: instance.start_time,
        end_time: instance.end_time,
        status: instance.status,
        notes: instance.notes || instance.recurring_rules?.notes,
        apartment: instance.recurring_rules?.apartment,
        client_address: instance.recurring_rules?.client_address,
        client_phone: instance.recurring_rules?.client_phone,
        client_email: instance.recurring_rules?.client_email,
        client_name: instance.recurring_rules?.client_name,
        recurring_rule_id: instance.recurring_rule_id,
        is_recurring_instance: true,
        recurrence: instance.recurring_rules?.recurrence_type,
        external_booking: false,
        created_at: instance.created_at,
        // Add listings data for compatibility
        listings: instance.recurring_rules?.listings,
        // Add mock user data for recurring appointments
        users: instance.recurring_rules?.client_name ? {
          name: instance.recurring_rules.client_name,
          phone: instance.recurring_rules.client_phone,
          email: instance.recurring_rules.client_email,
          condominium_name: null,
          house_number: null
        } : null,
        residencias: null
      }));

      // Combine all appointments
      const allAppointments = [
        ...(regularAppointments || []),
        ...transformedRecurringInstances
      ];

      console.log(`Total appointments for calendar: ${allAppointments.length}`);
      
      // Log appointment details for debugging
      allAppointments.forEach(apt => {
        console.log(`Appointment ${apt.id}:`, {
          start: apt.start_time,
          end: apt.end_time,
          status: apt.status,
          service: getListingTitle(apt.listings),
          client: apt.client_name || getUserName(apt.users),
          is_recurring: apt.is_recurring_instance,
          external: apt.external_booking
        });
      });

      return allAppointments;
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000 // 2 minutes
  });
};
