
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfToday, startOfWeek, startOfMonth } from "date-fns";

export function useStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const today = startOfToday();
      const weekStart = startOfWeek(today);
      const monthStart = startOfMonth(today);

      // Query based on user role
      const queryField = user.role === 'provider' ? 'provider_id' : 'client_id';

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq(queryField, user.id)
        .gte('start_time', monthStart.toISOString());

      if (appointmentsError) throw appointmentsError;

      const todayAppointments = appointments.filter(
        app => new Date(app.start_time) >= today
      ).length;

      const weekAppointments = appointments.filter(
        app => new Date(app.start_time) >= weekStart
      ).length;

      // Will be implemented with real payment data
      const monthRevenue = appointments.reduce((acc, app) => acc + 0, 0); 
      
      let activeClients = 0;
      if (user.role === 'provider') {
        // Count unique clients for this provider
        const uniqueClients = new Set(appointments.map(app => app.client_id));
        activeClients = uniqueClients.size;
      } else {
        // For clients, count unique providers they've booked with
        const uniqueProviders = new Set(appointments.map(app => app.provider_id));
        activeClients = uniqueProviders.size;
      }

      return {
        todayAppointments,
        weekAppointments,
        monthRevenue,
        activeClients
      };
    },
    enabled: !!user
  });
}
