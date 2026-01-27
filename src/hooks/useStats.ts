
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfToday, startOfWeek, startOfMonth, subWeeks, subMonths } from "date-fns";

// Utility function to calculate trend percentage
const calculateTrend = (current: number, previous: number) => {
  if (previous === 0 || !previous) return null;
  const percentage = ((current - previous) / previous) * 100;
  return {
    value: Math.round(Math.abs(percentage)),
    isPositive: percentage >= 0
  };
};

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
        
        // Calculate previous periods
        const previousWeekStart = startOfWeek(subWeeks(today, 1));
        const previousMonthStart = startOfMonth(subMonths(today, 1));

        // Default stats
        const defaultStats = {
          todayAppointments: 0,
          weekAppointments: 0,
          monthAppointments: 0,
          monthRevenue: 0,
          activeClients: 0,
          previousWeekAppointments: 0,
          previousMonthRevenue: 0,
          previousActiveClients: 0,
          weekAppointmentsTrend: null,
          monthRevenueTrend: null,
          activeClientsTrend: null
        };

        if (user.role === 'provider') {
          console.log("Fetching provider stats with optimized query...");
          
          // Single optimized query for all stats including previous periods
          const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
              start_time,
              status,
              client_id,
              listings!inner(base_price)
            `)
            .eq('provider_id', user.id)
            .gte('start_time', previousMonthStart.toISOString())
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
          let monthCount = 0;
          let monthRevenue = 0;
          let previousWeekCount = 0;
          let previousMonthRevenue = 0;
          const uniqueClients = new Set();
          const previousUniqueClients = new Set();

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
              
              // Count this month's appointments
              if (appDate >= monthStart) {
                monthCount++;
              }
              
              // Count previous week's appointments
              if (appDate >= previousWeekStart && appDate < weekStart) {
                previousWeekCount++;
              }
              
              // Calculate revenue from confirmed and completed appointments
              if (['confirmed', 'completed'].includes(app.status)) {
                const price = app.listings?.base_price || 0;
                const priceValue = parseFloat(price.toString());
                
                // Current month revenue
                if (appDate >= monthStart) {
                  monthRevenue += priceValue;
                }
                
                // Previous month revenue
                if (appDate >= previousMonthStart && appDate < monthStart) {
                  previousMonthRevenue += priceValue;
                }
              }
              
              // Track unique clients
              if (app.client_id) {
                if (appDate >= monthStart) {
                  uniqueClients.add(app.client_id);
                }
                if (appDate >= previousMonthStart && appDate < monthStart) {
                  previousUniqueClients.add(app.client_id);
                }
              }
            } catch (error) {
              console.error("Error processing appointment for stats:", error);
            }
          });

          // Calculate trends
          const weekAppointmentsTrend = calculateTrend(weekCount, previousWeekCount);
          const monthRevenueTrend = calculateTrend(monthRevenue, previousMonthRevenue);
          const activeClientsTrend = calculateTrend(uniqueClients.size, previousUniqueClients.size);

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthAppointments: monthCount,
            monthRevenue,
            activeClients: uniqueClients.size,
            previousWeekAppointments: previousWeekCount,
            previousMonthRevenue,
            previousActiveClients: previousUniqueClients.size,
            weekAppointmentsTrend,
            monthRevenueTrend,
            activeClientsTrend
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
            .gte('start_time', previousMonthStart.toISOString())
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
          let monthCount = 0;
          let monthRevenue = 0;
          let previousWeekCount = 0;
          let previousMonthRevenue = 0;
          const uniqueProviders = new Set();
          const previousUniqueProviders = new Set();

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
              
              if (appDate >= monthStart) {
                monthCount++;
              }
              
              if (appDate >= previousWeekStart && appDate < weekStart) {
                previousWeekCount++;
              }
              
              if (['confirmed', 'completed'].includes(app.status)) {
                const price = app.listings?.base_price || 0;
                const priceValue = parseFloat(price.toString());
                
                if (appDate >= monthStart) {
                  monthRevenue += priceValue;
                }
                
                if (appDate >= previousMonthStart && appDate < monthStart) {
                  previousMonthRevenue += priceValue;
                }
              }
              
              if (app.provider_id) {
                if (appDate >= monthStart) {
                  uniqueProviders.add(app.provider_id);
                }
                if (appDate >= previousMonthStart && appDate < monthStart) {
                  previousUniqueProviders.add(app.provider_id);
                }
              }
            } catch (error) {
              console.error("Error processing client appointment for stats:", error);
            }
          });

          // Calculate trends
          const weekAppointmentsTrend = calculateTrend(weekCount, previousWeekCount);
          const monthRevenueTrend = calculateTrend(monthRevenue, previousMonthRevenue);
          const activeClientsTrend = calculateTrend(uniqueProviders.size, previousUniqueProviders.size);

          return {
            todayAppointments: todayCount,
            weekAppointments: weekCount,
            monthAppointments: monthCount,
            monthRevenue,
            activeClients: uniqueProviders.size,
            previousWeekAppointments: previousWeekCount,
            previousMonthRevenue,
            previousActiveClients: previousUniqueProviders.size,
            weekAppointmentsTrend,
            monthRevenueTrend,
            activeClientsTrend
          };
        }

        return defaultStats;
        
      } catch (error) {
        console.error("Critical error in optimized stats query:", error);
        return {
          todayAppointments: 0,
          weekAppointments: 0,
          monthAppointments: 0,
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
