
import { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export const useDashboardAppointments = () => {
  const { user } = useAuth();
  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useStats();
  const queryClient = useQueryClient();
  
  const today = useMemo(() => startOfToday(), []);
  const tomorrow = useMemo(() => startOfTomorrow(), []);
  
  console.log("=== DASHBOARD APPOINTMENTS HOOK ===");
  console.log("User:", user?.id, user?.role);
  console.log("Appointments loading:", isLoadingAppointments, "Count:", appointments?.length || 0);
  console.log("Stats loading:", isLoadingStats);
  
  // Enhanced appointment filtering with deduplication and error handling
  const { todaysAppointments, tomorrowsAppointments, activeAppointmentsToday } = useMemo(() => {
    // Safe defaults in case of empty or undefined appointments
    if (!appointments || !Array.isArray(appointments) || appointments.length === 0) {
      console.log("No appointments available for filtering");
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }

    try {
      const now = new Date();
      
      console.log("=== FILTERING APPOINTMENTS ===");
      console.log(`Processing ${appointments.length} total appointments`);
      
      // Create a Map to deduplicate appointments by time slot
      const appointmentsByTimeSlot = new Map();
      
      // Process appointments and deduplicate with error handling
      appointments.forEach(app => {
        try {
          if (!app || app.status === 'cancelled' || app.status === 'rejected') return;
          
          const appDate = new Date(app.start_time);
          
          // Validate date
          if (isNaN(appDate.getTime())) {
            console.warn(`Invalid start_time for appointment ${app.id}: ${app.start_time}`);
            return;
          }
          
          const timeSlotKey = `${appDate.toISOString()}-${app.provider_id}`;
          
          // Check if we already have an appointment for this time slot
          if (appointmentsByTimeSlot.has(timeSlotKey)) {
            const existing = appointmentsByTimeSlot.get(timeSlotKey);
            // Prefer regular appointments over recurring instances
            if (!existing.is_recurring_instance && app.is_recurring_instance) {
              console.log(`Skipping duplicate recurring instance: ${app.client_name} at ${appDate.toLocaleString()}`);
              return;
            } else if (existing.is_recurring_instance && !app.is_recurring_instance) {
              console.log(`Replacing recurring instance with regular appointment: ${app.client_name} at ${appDate.toLocaleString()}`);
            }
          }
          
          appointmentsByTimeSlot.set(timeSlotKey, app);
        } catch (error) {
          console.error(`Error processing appointment ${app?.id || 'unknown'}:`, error);
        }
      });
      
      // Convert back to array and filter by date
      const uniqueAppointments = Array.from(appointmentsByTimeSlot.values());
      const todaysAppts: any[] = [];
      const tomorrowsAppts: any[] = [];
      
      uniqueAppointments.forEach(app => {
        try {
          const appDate = new Date(app.start_time);
          
          console.log(`Processing appointment ${app.id}:`, {
            date: appDate.toLocaleDateString(),
            time: appDate.toLocaleTimeString(),
            isToday: isSameDay(appDate, today),
            isTomorrow: isSameDay(appDate, tomorrow),
            status: app.status,
            isRecurring: app.is_recurring_instance,
            clientName: app.client_name,
            serviceName: app.listings?.title || app.service_title
          });
          
          if (isSameDay(appDate, today)) {
            todaysAppts.push(app);
          } else if (isSameDay(appDate, tomorrow)) {
            tomorrowsAppts.push(app);
          }
        } catch (error) {
          console.error(`Error filtering appointment ${app?.id || 'unknown'}:`, error);
        }
      });

      // Sort by start time
      todaysAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      tomorrowsAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Filter active appointments for today (not completed and not past end time)
      const activeToday = todaysAppts.filter(app => {
        try {
          return app.status !== 'completed' && new Date(app.end_time) > now;
        } catch (error) {
          console.error(`Error filtering active appointment ${app?.id || 'unknown'}:`, error);
          return false;
        }
      });

      console.log("=== APPOINTMENT FILTERING RESULTS ===");
      console.log(`Total unique appointments: ${uniqueAppointments.length}`);
      console.log(`Today's appointments: ${todaysAppts.length}`);
      console.log(`Tomorrow's appointments: ${tomorrowsAppts.length}`);
      console.log(`Active today: ${activeToday.length}`);
      
      // Log details of tomorrow's appointments for debugging
      if (tomorrowsAppts.length > 0) {
        console.log("Tomorrow's appointments details:");
        tomorrowsAppts.forEach((app, index) => {
          console.log(`${index + 1}. ${app.client_name} - ${new Date(app.start_time).toLocaleTimeString()} - ${app.is_recurring_instance ? 'Recurring' : 'Regular'}`);
        });
      }

      return {
        todaysAppointments: todaysAppts,
        tomorrowsAppointments: tomorrowsAppts,
        activeAppointmentsToday: activeToday
      };
    } catch (error) {
      console.error("Critical error filtering appointments:", error);
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }
  }, [appointments, today, tomorrow]);

  // Optimized auto-update for completed appointments (reduced frequency)
  useEffect(() => {
    if (!user || !appointments?.length) return;

    const updateCompletedAppointments = async () => {
      try {
        const now = new Date();
        const toUpdate = appointments.filter(
          app => app.status === 'confirmed' && 
                 new Date(app.end_time) < now &&
                 !app.is_recurring_instance // Only update regular appointments, not recurring instances
        );

        if (toUpdate.length > 0) {
          console.log("Updating status for", toUpdate.length, "completed appointments");
          
          const updatePromises = toUpdate.map(app =>
            supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('id', app.id)
          );
          
          await Promise.all(updatePromises);
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      } catch (error) {
        console.error("Error updating appointment statuses:", error);
      }
    };
    
    // Reduced frequency to prevent excessive updates
    const interval = setInterval(updateCompletedAppointments, 600000); // Every 10 minutes
    
    return () => clearInterval(interval);
  }, [user?.id, appointments?.length, queryClient]);

  return {
    user,
    appointments,
    stats,
    isLoadingAppointments,
    isLoadingStats,
    appointmentsError,
    statsError,
    todaysAppointments,
    tomorrowsAppointments,
    activeAppointmentsToday
  };
};
