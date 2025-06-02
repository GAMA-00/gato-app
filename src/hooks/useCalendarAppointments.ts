
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, addMonths, isSameDay, parseISO } from 'date-fns';

// Helper function to generate recurring appointment instances
const generateRecurringInstances = (baseAppointment: any, rangeStart: Date, rangeEnd: Date) => {
  const instances = [];
  const originalStart = parseISO(baseAppointment.start_time);
  const originalEnd = parseISO(baseAppointment.end_time);
  
  // Only generate for confirmed appointments with recurrence
  if (baseAppointment.status !== 'confirmed' || !baseAppointment.recurrence || baseAppointment.recurrence === 'none') {
    return [baseAppointment];
  }
  
  // Add the original appointment
  instances.push(baseAppointment);
  
  let currentStart = new Date(originalStart);
  let currentEnd = new Date(originalEnd);
  
  // Generate instances within the date range
  while (currentStart <= rangeEnd) {
    // Calculate next occurrence based on recurrence type
    switch (baseAppointment.recurrence) {
      case 'weekly':
        currentStart = addWeeks(currentStart, 1);
        currentEnd = addWeeks(currentEnd, 1);
        break;
      case 'biweekly':
        currentStart = addWeeks(currentStart, 2);
        currentEnd = addWeeks(currentEnd, 2);
        break;
      case 'monthly':
        currentStart = addMonths(currentStart, 1);
        currentEnd = addMonths(currentEnd, 1);
        break;
      default:
        // If recurrence type is not recognized, break the loop
        break;
    }
    
    // Only add if within range and after the original date
    if (currentStart >= rangeStart && currentStart <= rangeEnd && currentStart > originalStart) {
      instances.push({
        ...baseAppointment,
        id: `${baseAppointment.id}-recurring-${currentStart.toISOString()}`,
        start_time: currentStart.toISOString(),
        end_time: currentEnd.toISOString(),
        is_recurring_instance: true,
        original_appointment_id: baseAppointment.id
      });
    }
    
    // Safety check to prevent infinite loops (limit to 2 years ahead)
    if (currentStart > addMonths(originalStart, 24)) {
      break;
    }
  }
  
  return instances;
};

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
          // Fetch all confirmed appointments for this provider (not just within date range)
          // We need all recurring appointments to generate instances
          const { data: allAppointments, error } = await supabase
            .from('appointments')
            .select(`
              *,
              listings (
                id,
                title,
                description,
                base_price,
                duration
              )
            `)
            .eq('provider_id', user.id)
            .order('start_time');
            
          if (error) {
            console.error("Error fetching calendar appointments:", error);
            throw error;
          }
          
          if (!allAppointments || allAppointments.length === 0) {
            console.log("No appointments found for provider");
            return [];
          }
          
          console.log(`Found ${allAppointments.length} total appointments for provider`);
          
          // Generate recurring instances for all appointments
          let appointmentsWithRecurrence: any[] = [];
          
          allAppointments.forEach(appointment => {
            const instances = generateRecurringInstances(appointment, rangeStart, rangeEnd);
            appointmentsWithRecurrence.push(...instances);
          });
          
          // Filter to only show appointments within the date range
          const appointmentsInRange = appointmentsWithRecurrence.filter(appointment => {
            const appointmentDate = parseISO(appointment.start_time);
            return appointmentDate >= rangeStart && appointmentDate <= rangeEnd;
          });
          
          console.log(`Generated ${appointmentsWithRecurrence.length} total instances (including recurring)`);
          console.log(`Appointments in current view range: ${appointmentsInRange.length}`);
          
          // Enhanced client name handling for both internal and external bookings
          const clientIds = [...new Set(appointmentsInRange
            .filter(app => !app.external_booking && app.client_id)
            .map(app => app.client_id))];
          
          let clientNameMap: Record<string, string> = {};
          let clientLocationMap: Record<string, any> = {};
          
          if (clientIds.length > 0) {
            const { data: clients, error: clientsError } = await supabase
              .from('users')
              .select(`
                id, 
                name, 
                house_number,
                residencia_id,
                condominium_text
              `)
              .in('id', clientIds)
              .eq('role', 'client');
              
            console.log("Calendar - Clients data fetched:", clients);
              
            if (!clientsError && clients) {
              clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              // Get unique residencia IDs
              const residenciaIds = [...new Set(clients
                .map(client => client.residencia_id)
                .filter(Boolean))];
              
              console.log("Calendar - Residencia IDs to fetch:", residenciaIds);
              
              // Fetch residencias data
              let residenciasMap: Record<string, string> = {};
              if (residenciaIds.length > 0) {
                const { data: residencias, error: residenciasError } = await supabase
                  .from('residencias')
                  .select('id, name')
                  .in('id', residenciaIds);
                
                console.log("Calendar - Residencias fetched:", residencias);
                console.log("Calendar - Residencias error:", residenciasError);
                
                if (residencias && !residenciasError) {
                  residenciasMap = Object.fromEntries(
                    residencias.map(res => [res.id, res.name])
                  );
                }
              }
              
              console.log("Calendar - Final residenciasMap:", residenciasMap);
              
              // Create location map with complete address information using the new format
              clientLocationMap = Object.fromEntries(
                clients.map(client => {
                  const residenciaName = client.residencia_id ? residenciasMap[client.residencia_id] : '';
                  const condominiumName = client.condominium_text || '';
                  const houseNumber = client.house_number || '';
                  
                  const locationData = {
                    residencia: residenciaName,
                    condominium: condominiumName,
                    houseNumber: houseNumber
                  };
                  
                  console.log(`Calendar - Location data for client ${client.id}:`, locationData);
                  console.log(`Calendar - Residencia ID: ${client.residencia_id} -> Name: ${residenciaName}`);
                  console.log(`Calendar - Condominium Text: ${condominiumName}`);
                  console.log(`Calendar - House Number: ${houseNumber}`);
                  
                  return [client.id, locationData];
                })
              );
              
              console.log("Calendar - Client location map created:", clientLocationMap);
            }
          }
          
          // Process all appointments with enhanced external booking support
          appointmentsInRange.forEach(app => {
            if (app.external_booking) {
              // For external bookings, use the stored client_name directly from the appointment
              (app as any).client_name = app.client_name || 'Cliente Externo';
              (app as any).client_location = app.client_address || 'Ubicación no especificada';
              console.log(`External appointment ${app.id} client_name: "${app.client_name}"`);
            } else {
              // For internal bookings, use the user lookup or fallback
              (app as any).client_name = clientNameMap[app.client_id] || `Cliente #${app.client_id?.substring(0, 8) || 'N/A'}`;
              
              // Build location string for internal bookings with the new format: Residencia – Condominio – Número de casa
              const location = clientLocationMap[app.client_id];
              console.log(`Calendar - Building location for client ${app.client_id}:`, location);
              
              if (location) {
                const locationParts = [];
                
                // Add residencia if available
                if (location.residencia && location.residencia.trim()) {
                  locationParts.push(location.residencia.trim());
                }
                
                // Add condominium if it exists
                if (location.condominium && location.condominium.trim()) {
                  locationParts.push(location.condominium.trim());
                }
                
                // Add house number if available
                if (location.houseNumber && location.houseNumber.trim()) {
                  locationParts.push(location.houseNumber.trim());
                }
                
                // Build the final location string with the format: Residencia – Condominio – Número de casa
                const finalLocation = locationParts.length > 0 
                  ? locationParts.join(' – ') 
                  : 'Ubicación no especificada';
                
                (app as any).client_location = finalLocation;
                
                console.log(`Calendar - Final location for appointment ${app.id}: "${finalLocation}"`);
                console.log(`Calendar - Location parts used: [${locationParts.join(', ')}]`);
                console.log(`Calendar - Residencia: "${location.residencia}", Condominium: "${location.condominium}", House: "${location.houseNumber}"`);
              } else {
                (app as any).client_location = 'Ubicación no especificada';
                console.log(`Calendar - No location data found for client ${app.client_id}`);
              }
            }
          });
          
          // Mark recurring appointments and add enhanced information
          const enhancedAppointments = appointmentsInRange.map(app => {
            const isRecurring = app.recurrence && app.recurrence !== 'none';
            const isRecurringInstance = app.is_recurring_instance || false;
            
            return {
              ...app,
              is_recurring: isRecurring,
              is_recurring_instance: isRecurringInstance,
              is_external: !!app.external_booking,
              recurrence_label: 
                app.recurrence === 'weekly' ? 'Semanal' :
                app.recurrence === 'biweekly' ? 'Quincenal' :
                app.recurrence === 'monthly' ? 'Mensual' :
                app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
            };
          });
          
          // Group by date and booking type for debugging
          const appointmentsByDate = enhancedAppointments.reduce((acc, app) => {
            const date = new Date(app.start_time).toDateString();
            if (!acc[date]) acc[date] = [];
            acc[date].push({
              id: app.id,
              start_time: app.start_time,
              recurrence: app.recurrence,
              title: app.listings?.title,
              is_external: app.is_external,
              is_recurring_instance: app.is_recurring_instance,
              client_name: (app as any).client_name
            });
            return acc;
          }, {} as Record<string, any[]>);
          
          console.log('Appointments by date:', appointmentsByDate);
          console.log(`Calendar view: Found ${enhancedAppointments.length} appointments total`);
          console.log(`  - Internal: ${enhancedAppointments.filter(app => !app.is_external).length}`);
          console.log(`  - External: ${enhancedAppointments.filter(app => app.is_external).length}`);
          console.log(`  - Recurring: ${enhancedAppointments.filter(app => app.is_recurring).length}`);
          console.log(`  - Recurring instances: ${enhancedAppointments.filter(app => app.is_recurring_instance).length}`);
          console.log(`  - Pending: ${enhancedAppointments.filter(app => app.status === 'pending').length}`);
          
          // Log external appointments with their actual client names
          const externalApps = enhancedAppointments.filter(app => app.is_external);
          if (externalApps.length > 0) {
            console.log("External appointments in calendar:");
            externalApps.forEach(app => {
              console.log(`  - ${app.id}: Client "${(app as any).client_name}" at ${new Date(app.start_time).toLocaleString()}`);
            });
          }
          
          // Log recurring instances
          const recurringInstances = enhancedAppointments.filter(app => app.is_recurring_instance);
          if (recurringInstances.length > 0) {
            console.log("Recurring appointment instances in calendar:");
            recurringInstances.forEach(app => {
              console.log(`  - ${app.id}: ${app.recurrence} appointment at ${new Date(app.start_time).toLocaleString()}`);
            });
          }
          
          // Log internal appointments with their locations for debugging
          const internalApps = enhancedAppointments.filter(app => !app.is_external);
          if (internalApps.length > 0) {
            console.log("Internal appointments in calendar with locations:");
            internalApps.forEach(app => {
              console.log(`  - ${app.id}: Client "${(app as any).client_name}" at "${(app as any).client_location}"`);
            });
          }
          
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
