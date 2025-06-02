import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { addMonths, startOfWeek, endOfWeek } from 'date-fns';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function useAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['appointments', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("Fetching appointments for user:", user.id, "with role:", user.role);
      
      try {
        // Calculate a broader date range for calendar navigation
        const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
        const futureDate = addMonths(new Date(), 3);
        
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
            .gte('start_time', currentWeekStart.toISOString())
            .lte('start_time', futureDate.toISOString())
            .order('start_time');
            
          if (error) {
            console.error("Error fetching provider appointments:", error);
            throw error;
          }
          
          console.log(`Provider appointments data (${currentWeekStart.toISOString()} to ${futureDate.toISOString()}):`, appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for provider in date range");
            return [];
          }
          
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
              
            console.log("Clients data fetched:", clients);
              
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
              
              console.log("Residencia IDs to fetch:", residenciaIds);
              console.log("Condominium IDs to fetch:", condominiumIds);
              
              // Fetch residencias data
              let residenciasMap: Record<string, string> = {};
              if (residenciaIds.length > 0) {
                const { data: residencias, error: residenciasError } = await supabase
                  .from('residencias')
                  .select('id, name')
                  .in('id', residenciaIds);
                
                console.log("Residencias fetched:", residencias);
                console.log("Residencias error:", residenciasError);
                
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
                
                console.log("Condominiums fetched:", condominiums);
                console.log("Condominiums error:", condominiumsError);
                
                if (condominiums && !condominiumsError) {
                  condominiumsMap = Object.fromEntries(
                    condominiums.map(cond => [cond.id, cond.name])
                  );
                }
              }
              
              console.log("Final residenciasMap:", residenciasMap);
              console.log("Final condominiumsMap:", condominiumsMap);
              
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
                  
                  console.log(`Location data for client ${client.id}:`, locationData);
                  console.log(`  - Residencia ID: ${client.residencia_id} -> Name: ${residenciaName}`);
                  console.log(`  - Condominium ID: ${client.condominium_id} -> Name: ${condominiumName}`);
                  console.log(`  - House Number: ${houseNumber}`);
                  
                  return [client.id, locationData];
                })
              );
              
              console.log("Client location map created:", clientLocationMap);
            }
          }
          
          // Process all appointments with enhanced external booking support
          appointments.forEach(app => {
            if (app.external_booking) {
              // For external bookings, prioritize the stored client_name from the appointment
              (app as any).client_name = app.client_name || 'Cliente Externo';
              (app as any).client_phone = app.client_phone || '';
              (app as any).client_email = app.client_email || '';
              (app as any).client_location = app.client_address || 'Ubicación no especificada';
              console.log(`External appointment ${app.id} has client_name: "${app.client_name}"`);
            } else {
              // For internal bookings, use the user lookup or fallback
              (app as any).client_name = clientNameMap[app.client_id] || `Cliente #${app.client_id?.substring(0, 8) || 'N/A'}`;
              
              // Build location string for internal bookings with improved format
              const location = clientLocationMap[app.client_id];
              console.log(`Building location for client ${app.client_id}:`, location);
              
              if (location) {
                const locationParts = [];
                
                // Add residencia if available
                if (location.residencia && location.residencia.trim()) {
                  locationParts.push(location.residencia.trim());
                }
                
                // Add condominium if it exists (this is the critical part!)
                if (location.condominium && location.condominium.trim() && location.condominium.trim() !== location.residencia?.trim()) {
                  locationParts.push(location.condominium.trim());
                }
                
                // Add house number if available
                if (location.houseNumber && location.houseNumber.trim()) {
                  locationParts.push(`#${location.houseNumber.trim()}`);
                }
                
                // Build the final location string - ensure we show all parts
                const finalLocation = locationParts.length > 0 
                  ? locationParts.join(' - ') 
                  : 'Ubicación no especificada';
                
                (app as any).client_location = finalLocation;
                
                console.log(`Final location for appointment ${app.id}: "${finalLocation}"`);
                console.log(`Location parts used: [${locationParts.join(', ')}]`);
                console.log(`Residencia: "${location.residencia}", Condominium: "${location.condominium}", House: "${location.houseNumber}"`);
              } else {
                (app as any).client_location = 'Ubicación no especificada';
                console.log(`No location data found for client ${app.client_id}`);
              }
            }
          });
          
          // Mark recurring appointments and add enhanced information
          const enhancedAppointments = appointments.map(app => ({
            ...app,
            is_recurring: app.recurrence && app.recurrence !== 'none',
            is_external: !!app.external_booking,
            recurrence_label: 
              app.recurrence === 'weekly' ? 'Semanal' :
              app.recurrence === 'biweekly' ? 'Quincenal' :
              app.recurrence === 'monthly' ? 'Mensual' :
              app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
          }));
          
          console.log(`Returning ${enhancedAppointments.length} appointments total`);
          console.log(`  - Internal: ${enhancedAppointments.filter(app => !app.is_external).length}`);
          console.log(`  - External: ${enhancedAppointments.filter(app => app.is_external).length}`);
          console.log(`  - Recurring: ${enhancedAppointments.filter(app => app.is_recurring).length}`);
          console.log(`  - Pending: ${enhancedAppointments.filter(app => app.status === 'pending').length}`);
          
          // Log external appointments with their client names for debugging
          const externalApps = enhancedAppointments.filter(app => app.is_external);
          if (externalApps.length > 0) {
            console.log("External appointments with client names:");
            externalApps.forEach(app => {
              console.log(`  - ${app.id}: "${(app as any).client_name}" (original: "${app.client_name}")`);
            });
          }
          
          // Log internal appointments with their locations for debugging
          const internalApps = enhancedAppointments.filter(app => !app.is_external);
          if (internalApps.length > 0) {
            console.log("Internal appointments with locations:");
            internalApps.forEach(app => {
              console.log(`  - ${app.id}: "${(app as any).client_name}" at "${(app as any).client_location}"`);
            });
          }
          
          return enhancedAppointments;
        } 
        else if (user.role === 'client') {
          // Para clientes - solo citas internas (no pueden ver externas)
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
            .eq('client_id', user.id)
            .eq('external_booking', false) // Only internal bookings for clients
            .gte('start_time', currentWeekStart.toISOString())
            .lte('start_time', futureDate.toISOString())
            .order('start_time');
            
          if (error) {
            console.error("Error fetching client appointments:", error);
            throw error;
          }
          
          console.log(`Client appointments data (${currentWeekStart.toISOString()} to ${futureDate.toISOString()}):`, appointments);
          
          if (!appointments || appointments.length === 0) {
            console.log("No appointments for client in date range");
            return [];
          }
          
          // Get provider names from users table
          const providerIds = [...new Set(appointments.map(app => app.provider_id))];
          
          if (providerIds.length > 0) {
            const { data: providers, error: providersError } = await supabase
              .from('users')
              .select('id, name')
              .in('id', providerIds)
              .eq('role', 'provider');
              
            if (!providersError && providers) {
              const providerNameMap = Object.fromEntries(
                providers.map(provider => [provider.id, provider.name])
              );
              
              appointments.forEach(app => {
                (app as any).provider_name = providerNameMap[app.provider_id] || `Proveedor #${app.provider_id.substring(0, 8)}`;
              });
            }
          }
          
          // Mark recurring appointments in the response
          const enhancedAppointments = appointments.map(app => ({
            ...app,
            is_recurring: app.recurrence && app.recurrence !== 'none',
            is_external: false, // Clients only see internal bookings
            recurrence_label: 
              app.recurrence === 'weekly' ? 'Semanal' :
              app.recurrence === 'biweekly' ? 'Quincenal' :
              app.recurrence === 'monthly' ? 'Mensual' :
              app.recurrence && app.recurrence !== 'none' ? 'Recurrente' : null
          }));
          
          return enhancedAppointments;
        }
        
        return [];
      } catch (error) {
        console.error("Error in appointments query:", error);
        throw error;
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds to show new external bookings
    retry: 3
  });
}
