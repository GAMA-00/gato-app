
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

      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .gte('start_time', monthStart.toISOString());

      if (appointmentsError) throw appointmentsError;

      const todayAppointments = appointments.filter(
        app => new Date(app.start_time) >= today
      ).length;

      const weekAppointments = appointments.filter(
        app => new Date(app.start_time) >= weekStart
      ).length;

      const monthRevenue = appointments.reduce((acc, app) => acc + 0, 0); // Will be implemented with real payment data
      const activeClients = new Set(appointments.map(app => app.client_id)).size;

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
