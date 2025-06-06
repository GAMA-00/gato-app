
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface AppointmentData {
  id: string;
  provider_id: string;
  client_id: string | null;
  listing_id: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  apartment: string | null;
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
}

export const useCalendarAppointments = (currentDate: Date) => {
  const { user } = useAuth();
  
  const startDate = startOfMonth(currentDate);
  const endDate = endOfMonth(currentDate);
  
  return useQuery({
    queryKey: ['calendar-appointments', user?.id, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<EnhancedAppointment[]> => {
      if (!user?.id) {
        console.log('No user ID available');
        return [];
      }

      try {
        console.log('Fetching calendar appointments for provider:', user.id);
        console.log('Date range:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

        // Fetch regular appointments
        const { data: regularAppointments, error: regularError } = await supabase
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
            apartment,
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

        if (regularError) {
          console.error('Error fetching regular appointments:', regularError);
          throw new Error(`Error fetching appointments: ${regularError.message}`);
        }

        const appointments = regularAppointments || [];
        console.log(`Found ${appointments.length} regular appointments`);

        // Fetch listings data separately
        const listingIds = [...new Set(appointments.map(apt => apt.listing_id).filter(Boolean))];
        let listingsMap: Record<string, any> = {};
        
        if (listingIds.length > 0) {
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select(`
              id,
              title,
              service_type_id,
              service_types(name)
            `)
            .in('id', listingIds);

          if (!listingsError && listings) {
            listingsMap = listings.reduce((acc, listing) => {
              acc[listing.id] = listing;
              return acc;
            }, {} as Record<string, any>);
          } else {
            console.warn('Error fetching listings:', listingsError);
          }
        }

        // Fetch users data separately
        const clientIds = [...new Set(appointments.map(apt => apt.client_id).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        
        if (clientIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select(`
              id,
              name,
              phone,
              email,
              condominium_name,
              house_number
            `)
            .in('id', clientIds);

          if (!usersError && users) {
            usersMap = users.reduce((acc, user) => {
              acc[user.id] = user;
              return acc;
            }, {} as Record<string, any>);
          } else {
            console.warn('Error fetching users:', usersError);
          }
        }

        // Enhance appointments with related data
        const enhancedAppointments: EnhancedAppointment[] = appointments.map(appointment => ({
          ...appointment,
          listings: listingsMap[appointment.listing_id] || null,
          users: appointment.client_id ? usersMap[appointment.client_id] || null : null,
          residencias: null
        }));

        // Fetch recurring instances
        let recurringInstances: EnhancedAppointment[] = [];
        
        try {
          const { data: instances, error: recurringError } = await supabase
            .from('recurring_instances')
            .select(`
              id,
              recurring_rule_id,
              instance_date,
              start_time,
              end_time,
              status,
              notes,
              created_at
            `)
            .gte('instance_date', format(startDate, 'yyyy-MM-dd'))
            .lte('instance_date', format(endDate, 'yyyy-MM-dd'))
            .in('status', ['scheduled', 'confirmed', 'completed'])
            .order('start_time', { ascending: true });

          if (!recurringError && instances && instances.length > 0) {
            // Fetch recurring rules for the instances
            const ruleIds = [...new Set(instances.map(inst => inst.recurring_rule_id))];
            const { data: rules, error: rulesError } = await supabase
              .from('recurring_rules')
              .select(`
                id,
                provider_id,
                client_id,
                listing_id,
                recurrence_type,
                notes,
                apartment,
                client_address,
                client_phone,
                client_email,
                client_name
              `)
              .in('id', ruleIds)
              .eq('provider_id', user.id);

            if (!rulesError && rules) {
              const rulesMap = rules.reduce((acc, rule) => {
                acc[rule.id] = rule;
                return acc;
              }, {} as Record<string, any>);

              // Transform recurring instances to match appointment format
              recurringInstances = instances.map(instance => {
                const rule = rulesMap[instance.recurring_rule_id];
                const listing = rule ? listingsMap[rule.listing_id] : null;
                
                return {
                  id: instance.id,
                  provider_id: rule?.provider_id || user.id,
                  client_id: rule?.client_id || null,
                  listing_id: rule?.listing_id || '',
                  start_time: instance.start_time,
                  end_time: instance.end_time,
                  status: instance.status,
                  notes: instance.notes || rule?.notes || null,
                  apartment: rule?.apartment || null,
                  client_address: rule?.client_address || null,
                  client_phone: rule?.client_phone || null,
                  client_email: rule?.client_email || null,
                  client_name: rule?.client_name || null,
                  provider_name: null,
                  recurring_rule_id: instance.recurring_rule_id,
                  is_recurring_instance: true,
                  recurrence: rule?.recurrence_type || null,
                  external_booking: false,
                  created_at: instance.created_at,
                  listings: listing,
                  users: rule?.client_name ? {
                    name: rule.client_name,
                    phone: rule.client_phone || '',
                    email: rule.client_email || '',
                    condominium_name: null,
                    house_number: null
                  } : null,
                  residencias: null
                };
              });
            }
          }
        } catch (recurringError) {
          console.warn('Error fetching recurring instances:', recurringError);
          // Continue without recurring instances
        }

        // Combine all appointments
        const allAppointments = [...enhancedAppointments, ...recurringInstances];
        
        console.log(`Total appointments for calendar: ${allAppointments.length}`);
        console.log('Appointments breakdown:', {
          regular: enhancedAppointments.length,
          recurring: recurringInstances.length,
          confirmed: allAppointments.filter(apt => apt.status === 'confirmed').length,
          pending: allAppointments.filter(apt => apt.status === 'pending').length,
          external: allAppointments.filter(apt => apt.external_booking).length
        });

        return allAppointments;
        
      } catch (error) {
        console.error('Error in calendar appointments query:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
    retry: (failureCount, error) => {
      console.error(`Calendar query failed (attempt ${failureCount + 1}):`, error);
      return failureCount < 2; // Retry up to 2 times
    }
  });
};
