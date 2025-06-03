
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';

export const useCalendarAppointments = (currentDate: Date) => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['calendar-appointments', currentDate?.toISOString(), user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Calculate date range for the week view (with some buffer)
      const startDate = addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), -7);
      const endDate = addDays(endOfWeek(currentDate, { weekStartsOn: 0 }), 7);
      
      console.log('Fetching appointments for date range:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        userId: user.id,
        userRole: user.role
      });

      // Build the query based on user role
      let query = supabase
        .from('appointments')
        .select(`
          *,
          listings:listing_id (
            title,
            duration,
            base_price,
            service_variants
          ),
          client_user:client_id (
            name,
            condominium_text,
            house_number,
            residencia_id,
            residencias:residencia_id (
              name
            )
          ),
          provider_user:provider_id (
            name
          )
        `)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      // Filter by user role
      if (user.role === 'provider') {
        query = query.eq('provider_id', user.id);
      } else if (user.role === 'client') {
        query = query.eq('client_id', user.id);
      }

      const { data: appointments, error } = await query;

      if (error) {
        console.error('Error fetching appointments:', error);
        throw error;
      }

      console.log('Raw appointments data:', appointments);

      // Transform the data to include proper names and condominium info
      const transformedAppointments = appointments?.map(appointment => {
        // Get client info with condominium
        const clientInfo = appointment.client_user;
        let clientDisplayName = appointment.client_name || 'Cliente';
        let clientCondominium = '';
        let clientAddress = appointment.client_address || '';

        if (clientInfo) {
          clientDisplayName = clientInfo.name || appointment.client_name || 'Cliente';
          clientCondominium = clientInfo.condominium_text || '';
          
          // Build full address with condominium and house number
          if (clientCondominium && clientInfo.house_number) {
            clientAddress = `${clientCondominium}, Casa ${clientInfo.house_number}`;
          } else if (clientCondominium) {
            clientAddress = clientCondominium;
          } else if (clientInfo.house_number) {
            clientAddress = `Casa ${clientInfo.house_number}`;
          }
          
          // Add residencia name if available
          if (clientInfo.residencias?.name) {
            clientAddress = clientAddress ? 
              `${clientInfo.residencias.name} - ${clientAddress}` : 
              clientInfo.residencias.name;
          }
        }

        // Get provider info
        const providerInfo = appointment.provider_user;
        const providerDisplayName = providerInfo?.name || appointment.provider_name || 'Proveedor';

        return {
          ...appointment,
          client_name: clientDisplayName,
          client_address: clientAddress,
          client_condominium: clientCondominium,
          provider_name: providerDisplayName,
          is_recurring: appointment.recurrence && appointment.recurrence !== 'none',
          is_recurring_instance: false, // This would need additional logic for future instances
        };
      }) || [];

      console.log('Transformed appointments:', transformedAppointments);
      return transformedAppointments;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
};
