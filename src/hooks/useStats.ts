
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
        .select('*, listings(base_price)')
        .eq(queryField, user.id)
        .gte('start_time', monthStart.toISOString());

      if (appointmentsError) {
        console.error("Error fetching appointments for stats:", appointmentsError);
        throw appointmentsError;
      }

      // Count today's appointments
      const todayAppointments = appointments.filter(
        app => {
          const appDate = new Date(app.start_time);
          return appDate >= today && app.status !== 'cancelled';
        }
      ).length;

      // Count this week's appointments
      const weekAppointments = appointments.filter(
        app => {
          const appDate = new Date(app.start_time);
          return appDate >= weekStart && app.status !== 'cancelled';
        }
      ).length;

      // Calculate month revenue from confirmed and completed appointments
      const monthRevenue = appointments
        .filter(app => ['confirmed', 'completed'].includes(app.status))
        .reduce((acc, app) => {
          const price = app.listings?.base_price || 0;
          return acc + parseFloat(price);
        }, 0);
      
      // Count unique clients or providers
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
