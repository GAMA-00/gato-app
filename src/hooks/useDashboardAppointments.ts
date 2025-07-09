
import { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

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
  
  // Enhanced appointment filtering with deduplication and GUARANTEED LOCATION CONSTRUCTION
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
      
      console.log("=== FILTERING APPOINTMENTS WITH LOCATION VERIFICATION ===");
      console.log(`Processing ${appointments.length} total appointments`);
      
      // Create a Map to deduplicate appointments by time slot
      const appointmentsByTimeSlot = new Map();
      
      // Process appointments and maintain chronological order regardless of recurrence type
      appointments.forEach(app => {
        try {
          if (!app || app.status === 'cancelled' || app.status === 'rejected') return;
          
          // Include 'scheduled' status for recurring instances
          if (!['pending', 'confirmed', 'completed', 'scheduled'].includes(app.status)) {
            console.log(`Skipping appointment ${app.id} with status: ${app.status}`);
            return;
          }
          
          const appDate = new Date(app.start_time);
          
          // Validate date
          if (isNaN(appDate.getTime())) {
            console.warn(`Invalid start_time for appointment ${app.id}: ${app.start_time}`);
            return;
          }
          
          // GARANTIZAR UBICACIÓN COMPLETA AQUÍ
          console.log(`🔍 VERIFICANDO UBICACIÓN PARA APPOINTMENT ${app.id}:`);
          console.log('Current complete_location:', app.complete_location);
          console.log('Has client_data:', !!app.client_data);
          console.log('External booking:', app.external_booking);
          
          // Si no tiene complete_location, construirla ahora
          if (!app.complete_location || app.complete_location === 'Residencia por confirmar') {
            console.log(`⚠️ CONSTRUYENDO UBICACIÓN FALTANTE PARA ${app.id}`);
            
            const guaranteedLocation = buildAppointmentLocation({
              appointment: app,
              clientData: app.client_data
            });
            
            console.log(`✅ UBICACIÓN CONSTRUIDA PARA ${app.id}: "${guaranteedLocation}"`);
            app.complete_location = guaranteedLocation;
          } else {
            console.log(`✅ UBICACIÓN YA EXISTE PARA ${app.id}: "${app.complete_location}"`);
          }
          
          // Use time slot key for proper deduplication (provider + time + client + listing)
          // This ensures we only show one appointment per unique combination
          const timeSlotKey = `${appDate.toISOString()}-${app.provider_id}-${app.client_id}-${app.listing_id}`;
          
          // Check if we already have an appointment for this time slot
          const existingApp = appointmentsByTimeSlot.get(timeSlotKey);
          
          if (!existingApp) {
            // No existing appointment, add this one
            appointmentsByTimeSlot.set(timeSlotKey, app);
            console.log(`✅ Added appointment: ${app.client_name} - ${appDate.toLocaleString()} (recurring: ${app.is_recurring_instance})`);
          } else {
            // There's already an appointment for this time slot
            console.log(`🔍 Duplicate found: ${app.client_name} - ${appDate.toLocaleString()}`);
            console.log(`  Existing: ${existingApp.client_name} (recurring: ${existingApp.is_recurring_instance})`);
            console.log(`  New: ${app.client_name} (recurring: ${app.is_recurring_instance})`);
            
            // Prefer regular appointments over recurring instances
            if (existingApp.is_recurring_instance && !app.is_recurring_instance) {
              // Replace recurring instance with regular appointment
              appointmentsByTimeSlot.set(timeSlotKey, app);
              console.log(`🔄 Replaced recurring instance with regular appointment for ${appDate.toLocaleString()}`);
            } else if (!existingApp.is_recurring_instance && app.is_recurring_instance) {
              // Keep the regular appointment, skip the recurring instance
              console.log(`⚠️ Skipped duplicate recurring instance for ${appDate.toLocaleString()}`);
            } else {
              // Both are the same type, keep the first one
              console.log(`⚠️ Duplicate appointment found for ${appDate.toLocaleString()}, keeping first one`);
            }
          }
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
          
          console.log(`📅 Processing appointment ${app.id} for date filtering:`, {
            date: appDate.toLocaleDateString(),
            time: appDate.toLocaleTimeString(),
            isToday: isSameDay(appDate, today),
            isTomorrow: isSameDay(appDate, tomorrow),
            status: app.status,
            isRecurring: app.is_recurring_instance,
            clientName: app.client_name,
            serviceName: app.listings?.title || app.service_title,
            complete_location: app.complete_location,
            has_client_data: !!app.client_data,
            recurring_rule_id: app.recurring_rule_id
          });
          
          if (isSameDay(appDate, today)) {
            todaysAppts.push(app);
            console.log(`📍 TODAY: Added appointment ${app.id} with location: "${app.complete_location}"`);
          } else if (isSameDay(appDate, tomorrow)) {
            tomorrowsAppts.push(app);
            console.log(`📍 TOMORROW: Added appointment ${app.id} with location: "${app.complete_location}"`);
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

      console.log("=== APPOINTMENT FILTERING RESULTS WITH LOCATION VERIFICATION ===");
      console.log(`Total unique appointments: ${uniqueAppointments.length}`);
      console.log(`Today's appointments: ${todaysAppts.length}`);
      console.log(`Tomorrow's appointments: ${tomorrowsAppts.length}`);
      console.log(`Active today: ${activeToday.length}`);
      
      // Log details of all appointments with their locations
      if (todaysAppts.length > 0) {
        console.log("🏠 TODAY'S APPOINTMENTS WITH LOCATIONS:");
        todaysAppts.forEach((app, index) => {
          console.log(`${index + 1}. ${app.client_name} - ${new Date(app.start_time).toLocaleTimeString()} - Location: "${app.complete_location}" - ${app.is_recurring_instance ? 'Recurring' : 'Regular'}`);
        });
      }
      
      if (tomorrowsAppts.length > 0) {
        console.log("🏠 TOMORROW'S APPOINTMENTS WITH LOCATIONS:");
        tomorrowsAppts.forEach((app, index) => {
          console.log(`${index + 1}. ${app.client_name} - ${new Date(app.start_time).toLocaleTimeString()} - Location: "${app.complete_location}" - ${app.is_recurring_instance ? 'Recurring' : 'Regular'}`);
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
          app => (app.status === 'confirmed' || app.status === 'scheduled') && 
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
