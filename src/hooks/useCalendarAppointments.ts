
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

      // First, fetch regular appointments with only basic data
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
        throw regularError;
      }

      console.log(`Found ${regularAppointments?.length || 0} regular appointments`);

      // Fetch listing data separately for regular appointments
      const listingIds = [...new Set(regularAppointments?.map(apt => apt.listing_id).filter(Boolean) || [])];
      let listingsData = {};
      
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
          listingsData = listings.reduce((acc, listing) => {
            acc[listing.id] = listing;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Fetch user data separately for clients
      const clientIds = [...new Set(regularAppointments?.map(apt => apt.client_id).filter(Boolean) || [])];
      let usersData = {};
      
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
          usersData = users.reduce((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Enhance regular appointments with listing and user data
      const enhancedRegularAppointments = (regularAppointments || []).map(appointment => ({
        ...appointment,
        listings: listingsData[appointment.listing_id] || null,
        users: usersData[appointment.client_id] || null,
        residencias: null // Add this for compatibility
      }));

      // Fetch recurring instances
      const { data: recurringInstances, error: recurringError } = await supabase
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

      if (recurringError) {
        console.error('Error fetching recurring instances:', recurringError);
        // Don't throw error for recurring instances, just log and continue
      }

      console.log(`Found ${recurringInstances?.length || 0} recurring instances`);

      // Fetch recurring rules data for the instances
      const ruleIds = [...new Set(recurringInstances?.map(inst => inst.recurring_rule_id).filter(Boolean) || [])];
      let rulesData = {};
      let ruleListingsData = {};
      
      if (ruleIds.length > 0) {
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
          rulesData = rules.reduce((acc, rule) => {
            acc[rule.id] = rule;
            return acc;
          }, {} as Record<string, any>);

          // Fetch listings for recurring rules
          const ruleListingIds = [...new Set(rules.map(rule => rule.listing_id).filter(Boolean))];
          if (ruleListingIds.length > 0) {
            const { data: ruleListings, error: ruleListingsError } = await supabase
              .from('listings')
              .select(`
                id,
                title,
                service_type_id,
                service_types(name)
              `)
              .in('id', ruleListingIds);

            if (!ruleListingsError && ruleListings) {
              ruleListingsData = ruleListings.reduce((acc, listing) => {
                acc[listing.id] = listing;
                return acc;
              }, {} as Record<string, any>);
            }
          }
        }
      }

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
      const transformedRecurringInstances = (recurringInstances || []).map(instance => {
        const rule = rulesData[instance.recurring_rule_id];
        const listing = rule ? ruleListingsData[rule.listing_id] : null;
        
        return {
          id: instance.id,
          provider_id: rule?.provider_id || user.id,
          client_id: rule?.client_id,
          listing_id: rule?.listing_id,
          start_time: instance.start_time,
          end_time: instance.end_time,
          status: instance.status,
          notes: instance.notes || rule?.notes,
          apartment: rule?.apartment,
          client_address: rule?.client_address,
          client_phone: rule?.client_phone,
          client_email: rule?.client_email,
          client_name: rule?.client_name,
          recurring_rule_id: instance.recurring_rule_id,
          is_recurring_instance: true,
          recurrence: rule?.recurrence_type,
          external_booking: false,
          created_at: instance.created_at,
          // Add listings data for compatibility
          listings: listing,
          // Add mock user data for recurring appointments
          users: rule?.client_name ? {
            name: rule.client_name,
            phone: rule.client_phone,
            email: rule.client_email,
            condominium_name: null,
            house_number: null
          } : null,
          residencias: null
        };
      });

      // Combine all appointments
      const allAppointments = [
        ...enhancedRegularAppointments,
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
