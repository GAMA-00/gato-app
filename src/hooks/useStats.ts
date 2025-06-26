
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfToday, startOfWeek, startOfMonth } from "date-fns";

export function useStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['stats', user?.id, user?.role],
    queryFn: async () => {
      if (!user) {
        console.log("No user found for stats");
        return null;
      }

      console.log("Fetching optimized stats for user:", user.id, "role:", user.role);

      try {
        const today = startOfToday();
        const weekStart = startOfWeek(today);
        const monthStart = startOfMonth(today);

        // Default stats
        const defaultStats = {
          todayAppointments: 0,
          weekAppointments: 0,
          monthRevenue: 0,
          activeClients: 0
        };

        if (user.role === 'provider') {
          console.log("Fetching provider stats with optimized query...");
          
          // Single optimized query for all stats with error handling
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
              start_time,
              status,
              client_id,
              listings!inner(base_price)
            `)
            .eq('provider_id', user.id)
            .gte('start_time', monthStart.toISOString())
            .in('status', ['pending', 'confirmed', 'completed']);

          if (error) {
            console.error("Error fetching provider stats:", error);
            return defaultStats;
          }

          if (!appointments || appointments.length === 0) {
            console.log("No appointments found for provider stats");
            return defaultStats;
          }

          // Calculate all stats in a single pass for maximum efficiency
          let todayCount = 0;
          let weekCount = 0;
          let monthRevenue = 0;
          const uniqueClients = new Set();

          appointments.forEach(app => {
            try {
              const appDate = new Date(app.start_time);
              
              // Validate date
              if (isNaN(appDate.getTime())) {
                console.warn(`Invalid date in stats: ${app.start_time}`);
                return;
              }
              
              // Count today's appointments
              if (appDate >= today) {
                todayCount++;
              }
              
              // Count this week's appointments
              if (appDate >= weekStart) {
                weekCount++;
              }
              
              // Calculate revenue from confirmed and completed appointments
              if (['confirmed', 'completed'].includes(app.status)) {
                const price = app.listings?.base_price || 0;
                monthRevenue += parseFloat(price.toString());
              }
              
              // Track unique clients
              if (app.client_id) {
                uniqueClients.add(app.client_id);
              }
            } catch (error) {
              console.error("Error processing appointment for stats:", error);
            }
          });

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthRevenue,
            activeClients: uniqueClients.size
          };
          
        } else if (user.role === 'client') {
          console.log("Fetching client stats with optimized query...");
          
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
              start_time,
              status,
              provider_id,
              listings!inner(base_price)
            `)
            .eq('client_id', user.id)
            .gte('start_time', monthStart.toISOString())
            .in('status', ['pending', 'confirmed', 'completed']);

          if (error) {
            console.error("Error fetching client stats:", error);
            return defaultStats;
          }

          if (!appointments || appointments.length === 0) {
            console.log("No appointments found for client stats");
            return defaultStats;
          }

          // Calculate stats efficiently
          let todayCount = 0;
          let weekCount = 0;
          let monthRevenue = 0;
          const uniqueProviders = new Set();

          appointments.forEach(app => {
            try {
              const appDate = new Date(app.start_time);
              
              // Validate date
              if (isNaN(appDate.getTime())) {
                console.warn(`Invalid date in client stats: ${app.start_time}`);
                return;
              }
              
              if (appDate >= today) {
                todayCount++;
              }
              
              if (appDate >= weekStart) {
                weekCount++;
              }
              
              if (['confirmed', 'completed'].includes(app.status)) {
                const price = app.listings?.base_price || 0;
                monthRevenue += parseFloat(price.toString());
              }
              
              if (app.provider_id) {
                uniqueProviders.add(app.provider_id);
              }
            } catch (error) {
              console.error("Error processing client appointment for stats:", error);
            }
          });

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthRevenue,
            activeClients: uniqueProviders.size
          };
        }

        return defaultStats;
        
      } catch (error) {
        console.error("Critical error in optimized stats query:", error);
        return {
          todayAppointments: 0,
          weekAppointments: 0,
          monthRevenue: 0,
          activeClients: 0
        };
      }
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // 5 minutes
    retry: 2, // Reduced retries for faster fallback
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false
  });
}
