
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfToday, startOfWeek, startOfMonth } from "date-fns";

export function useStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return null;

      const today = startOfToday();
      const weekStart = startOfWeek(today);
      const monthStart = startOfMonth(today);

      // Only query data specific to the user's role
      if (user.role === 'provider') {
        // For providers, only show appointments where they are the provider
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*, listings(base_price)')
          .eq('provider_id', user.id)
          .gte('start_time', monthStart.toISOString());

        if (appointmentsError) {
          console.error("Error fetching provider appointments for stats:", appointmentsError);
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
            return acc + parseFloat(price.toString());
          }, 0);
        
        // Count unique clients for this provider
        const uniqueClients = new Set(appointments.map(app => app.client_id));
        const activeClients = uniqueClients.size;

        return {
          todayAppointments,
          weekAppointments,
          monthRevenue,
          activeClients
        };
      } else if (user.role === 'client') {
        // For clients, only show appointments where they are the client
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*, listings(base_price)')
          .eq('client_id', user.id)
          .gte('start_time', monthStart.toISOString());

        if (appointmentsError) {
          console.error("Error fetching client appointments for stats:", appointmentsError);
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

        // Calculate month spending from confirmed and completed appointments
        const monthRevenue = appointments
          .filter(app => ['confirmed', 'completed'].includes(app.status))
          .reduce((acc, app) => {
            const price = app.listings?.base_price || 0;
            return acc + parseFloat(price.toString());
          }, 0);
        
        // For clients, count unique providers they've booked with
        const uniqueProviders = new Set(appointments.map(app => app.provider_id));
        const activeClients = uniqueProviders.size;

        return {
          todayAppointments,
          weekAppointments,
          monthRevenue,
          activeClients
        };
      }

      // Return default empty stats if role doesn't match
      return {
        todayAppointments: 0,
        weekAppointments: 0,
        monthRevenue: 0,
        activeClients: 0
      };
    },
    enabled: !!user
  });
}
