
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

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
          const { data: appointments, error } = await supabase
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
            .gte('start_time', rangeStart.toISOString())
            .lte('start_time', rangeEnd.toISOString())
            .order('start_time');
            
          if (error) {
            console.error("Error fetching calendar appointments:", error);
            throw error;
          }
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments in calendar range");
            return [];
          }
          
          console.log(`Found ${appointments.length} appointments in date range`);
          
          // Enhanced client name handling for both internal and external bookings
          const clientIds = [...new Set(appointments
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
                condominium_id
              `)
              .in('id', clientIds)
              .eq('role', 'client');
              
            console.log("Calendar - Clients data fetched:", clients);
              
            if (!clientsError && clients) {
              clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              // Get unique residencia and condominium IDs
              const residenciaIds = [...new Set(clients
                .map(client => client.residencia_id)
                .filter(Boolean))];
              const condominiumIds = [...new Set(clients
                .map(client => client.condominium_id)
                .filter(Boolean))];
              
              console.log("Calendar - Residencia IDs to fetch:", residenciaIds);
              console.log("Calendar - Condominium IDs to fetch:", condominiumIds);
              
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
              
              // Fetch condominiums data
              let condominiumsMap: Record<string, string> = {};
              if (condominiumIds.length > 0) {
                const { data: condominiums, error: condominiumsError } = await supabase
                  .from('condominiums')
                  .select('id, name')
                  .in('id', condominiumIds);
                
                console.log("Calendar - Condominiums fetched:", condominiums);
                console.log("Calendar - Condominiums error:", condominiumsError);
                
                if (condominiums && !condominiumsError) {
                  condominiumsMap = Object.fromEntries(
                    condominiums.map(cond => [cond.id, cond.name])
                  );
                }
              }
              
              console.log("Calendar - Final residenciasMap:", residenciasMap);
              console.log("Calendar - Final condominiumsMap:", condominiumsMap);
              
              // Create location map with complete address information
              clientLocationMap = Object.fromEntries(
                clients.map(client => {
                  const residenciaName = client.residencia_id ? residenciasMap[client.residencia_id] : '';
                  const condominiumName = client.condominium_id ? condominiumsMap[client.condominium_id] : '';
                  const houseNumber = client.house_number || '';
                  
                  const locationData = {
                    residencia: residenciaName,
                    condominium: condominiumName,
                    houseNumber: houseNumber
                  };
                  
                  console.log(`Calendar - Location data for client ${client.id}:`, locationData);
                  console.log(`Calendar - Residencia ID: ${client.residencia_id} -> Name: ${residenciaName}`);
                  console.log(`Calendar - Condominium ID: ${client.condominium_id} -> Name: ${condominiumName}`);
                  console.log(`Calendar - House Number: ${houseNumber}`);
                  
                  return [client.id, locationData];
                })
              );
              
              console.log("Calendar - Client location map created:", clientLocationMap);
            }
          }
          
          // Process all appointments with enhanced external booking support
          appointments.forEach(app => {
            if (app.external_booking) {
              // For external bookings, use the stored client_name directly from the appointment
              (app as any).client_name = app.client_name || 'Cliente Externo';
              (app as any).client_location = app.client_address || 'Ubicación no especificada';
              console.log(`External appointment ${app.id} client_name: "${app.client_name}"`);
            } else {
              // For internal bookings, use the user lookup or fallback
              (app as any).client_name = clientNameMap[app.client_id] || `Cliente #${app.client_id?.substring(0, 8) || 'N/A'}`;
              
              // Build location string for internal bookings with improved format
              const location = clientLocationMap[app.client_id];
              console.log(`Calendar - Building location for client ${app.client_id}:`, location);
              
              if (location) {
                const locationParts = [];
                
                // Add residencia if available
                if (location.residencia && location.residencia.trim()) {
                  locationParts.push(location.residencia.trim());
                }
                
                // Add condominium if it exists (key fix: ensure we include condominium!)
                if (location.condominium && location.condominium.trim() && location.condominium.trim() !== location.residencia?.trim()) {
                  locationParts.push(location.condominium.trim());
                }
                
                // Add house number if available
                if (location.houseNumber && location.houseNumber.trim()) {
                  locationParts.push(`#${location.houseNumber.trim()}`);
                }
                
                // Build the final location string - ensure all parts are included
                const finalLocation = locationParts.length > 0 
                  ? locationParts.join(' - ') 
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
          const enhancedAppointments = appointments.map(app => {
            const isRecurring = app.recurrence && app.recurrence !== 'none';
            
            return {
              ...app,
              is_recurring: isRecurring,
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
              client_name: (app as any).client_name
            });
            return acc;
          }, {} as Record<string, any[]>);
          
          console.log('Appointments by date:', appointmentsByDate);
          console.log(`Calendar view: Found ${enhancedAppointments.length} appointments total`);
          console.log(`  - Internal: ${enhancedAppointments.filter(app => !app.is_external).length}`);
          console.log(`  - External: ${enhancedAppointments.filter(app => app.is_external).length}`);
          console.log(`  - Recurring: ${enhancedAppointments.filter(app => app.is_recurring).length}`);
          console.log(`  - Pending: ${enhancedAppointments.filter(app => app.status === 'pending').length}`);
          
          // Log external appointments with their actual client names
          const externalApps = enhancedAppointments.filter(app => app.is_external);
          if (externalApps.length > 0) {
            console.log("External appointments in calendar:");
            externalApps.forEach(app => {
              console.log(`  - ${app.id}: Client "${(app as any).client_name}" at ${new Date(app.start_time).toLocaleString()}`);
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
