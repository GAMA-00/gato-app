
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

export function useCalendarAppointments(currentDate: Date) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['calendar-appointments', user?.id, user?.role, currentDate.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      
      // Calculate date range for the current calendar view (current week + 4 weeks before and after)
      const currentWeekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const rangeStart = startOfWeek(subWeeks(currentWeekStart, 4), { weekStartsOn: 0 });
      const rangeEnd = endOfWeek(addWeeks(currentWeekStart, 4), { weekStartsOn: 0 });
      
      console.log(`Fetching calendar appointments for range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);
      console.log(`Current calendar date: ${currentDate.toISOString()}`);
      
      try {
        if (user.role === 'provider') {
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
              *,
              listings (
                id,
                title,
                description,
                base_price,
                duration
              ),
              residencias (
                id,
                name,
                address
              )
            `)
            .eq('provider_id', user.id)
            .gte('start_time', rangeStart.toISOString())
            .lte('start_time', rangeEnd.toISOString())
            .order('start_time');
            
          if (error) {
            console.error("Error fetching calendar appointments:", error);
            throw error;
          }
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments in calendar range");
            return [];
          }
          
          console.log(`Found ${appointments.length} appointments in date range`);
          
          // Get client names
          const clientIds = [...new Set(appointments.map(app => app.client_id))];
          
          if (clientIds.length > 0) {
            const { data: clients, error: clientsError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', clientIds)
              .eq('role', 'client');
              
            if (!clientsError && clients) {
              const clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              appointments.forEach(app => {
                (app as any).client_name = clientNameMap[app.client_id] || `Cliente #${app.client_id.substring(0, 8)}`;
              });
            }
          }
          
          // Mark recurring appointments and add enhanced information
          const enhancedAppointments = appointments.map(app => {
            const isRecurring = app.recurrence && app.recurrence !== 'none';
            
            return {
              ...app,
              is_recurring: isRecurring,
              recurrence_label: 
                app.recurrence === 'weekly' ? 'Semanal' :
                app.recurrence === 'biweekly' ? 'Quincenal' :
                app.recurrence === 'monthly' ? 'Mensual' :
                app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
            };
          });
          
          // Group by date for debugging
          const appointmentsByDate = enhancedAppointments.reduce((acc, app) => {
            const date = new Date(app.start_time).toDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push({
              id: app.id,
              start_time: app.start_time,
              recurrence: app.recurrence,
              title: app.listings?.title
            });
            return acc;
          }, {} as Record<string, any[]>);
          
          console.log('Appointments by date:', appointmentsByDate);
          console.log(`Calendar view: Found ${enhancedAppointments.length} appointments, ${enhancedAppointments.filter(app => app.is_recurring).length} recurring`);
          
          return enhancedAppointments;
        }
        
        return [];
      } catch (error) {
        console.error("Error in calendar appointments query:", error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'provider',
    refetchInterval: 30000,
    retry: 3
  });
}
