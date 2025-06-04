
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

      console.log("Fetching stats for user:", user.id, "role:", user.role);

      try {
        const today = startOfToday();
        const weekStart = startOfWeek(today);
        const monthStart = startOfMonth(today);

        // Initialize default stats
        const defaultStats = {
          todayAppointments: 0,
          weekAppointments: 0,
          monthRevenue: 0,
          activeClients: 0
        };

        // Only query data specific to the user's role
        if (user.role === 'provider') {
          console.log("Fetching provider stats...");
          
          const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*, listings(base_price)')
            .eq('provider_id', user.id)
            .gte('start_time', monthStart.toISOString());

          if (appointmentsError) {
            console.error("Error fetching provider appointments for stats:", appointmentsError);
            // Return default stats instead of throwing
            return defaultStats;
          }

          if (!appointments || appointments.length === 0) {
            console.log("No appointments found for provider stats");
            return defaultStats;
          }

          // Calculate stats in a single pass for better performance
          let todayCount = 0;
          let weekCount = 0;
          let monthRevenue = 0;
          const uniqueClients = new Set();

          appointments.forEach(app => {
            try {
              const appDate = new Date(app.start_time);
              const isNotCancelled = app.status !== 'cancelled';
              
              if (isNotCancelled) {
                // Count today's appointments
                if (appDate >= today) {
                  todayCount++;
                }
                
                // Count this week's appointments
                if (appDate >= weekStart) {
                  weekCount++;
                }
                
                // Calculate month revenue from confirmed and completed appointments
                if (['confirmed', 'completed'].includes(app.status)) {
                  const price = app.listings?.base_price || 0;
                  monthRevenue += parseFloat(price.toString());
                }
                
                // Track unique clients
                if (app.client_id) {
                  uniqueClients.add(app.client_id);
                }
              }
            } catch (error) {
              console.error("Error processing appointment:", app.id, error);
            }
          });

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthRevenue,
            activeClients: uniqueClients.size
          };
          
        } else if (user.role === 'client') {
          console.log("Fetching client stats...");
          
          const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*, listings(base_price)')
            .eq('client_id', user.id)
            .gte('start_time', monthStart.toISOString());

          if (appointmentsError) {
            console.error("Error fetching client appointments for stats:", appointmentsError);
            return defaultStats;
          }

          if (!appointments || appointments.length === 0) {
            console.log("No appointments found for client stats");
            return defaultStats;
          }

          // Calculate stats in a single pass
          let todayCount = 0;
          let weekCount = 0;
          let monthRevenue = 0;
          const uniqueProviders = new Set();

          appointments.forEach(app => {
            try {
              const appDate = new Date(app.start_time);
              const isNotCancelled = app.status !== 'cancelled';
              
              if (isNotCancelled) {
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
              }
            } catch (error) {
              console.error("Error processing appointment:", app.id, error);
            }
          });

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthRevenue,
            activeClients: uniqueProviders.size
          };
        }

        // Return default empty stats if role doesn't match
        console.log("Unknown role or no role specified, returning default stats");
        return defaultStats;
        
      } catch (error) {
        console.error("Error in stats query:", error);
        // Return default stats instead of throwing
        return {
          todayAppointments: 0,
          weekAppointments: 0,
          monthRevenue: 0,
          activeClients: 0
        };
      }
    },
    enabled: !!user,
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
    retry: 1, // Reduce retry attempts
    refetchOnWindowFocus: false,
    // Add error handling
    meta: {
      onError: (error: any) => {
        console.error("Stats query failed:", error);
      }
    }
  });
}
