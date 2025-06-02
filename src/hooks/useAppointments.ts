
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
                residencias:residencia_id (
                  id,
                  name
                ),
                condominiums:condominium_id (
                  id,
                  name
                )
              `)
              .in('id', clientIds)
              .eq('role', 'client');
              
            if (!clientsError && clients) {
              clientNameMap = Object.fromEntries(
                clients.map(client => [client.id, client.name])
              );
              
              // Create location map with complete address information including condominium
              clientLocationMap = Object.fromEntries(
                clients.map(client => [
                  client.id, 
                  {
                    residencia: client.residencias?.name || '',
                    condominium: client.condominiums?.name || '',
                    houseNumber: client.house_number || ''
                  }
                ])
              );
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
              
              // Build location string for internal bookings with proper format
              const location = clientLocationMap[app.client_id];
              if (location) {
                const locationParts = [];
                
                // Always add residencia if available
                if (location.residencia) {
                  locationParts.push(location.residencia);
                }
                
                // Add condominium only if it exists and is different from residencia
                if (location.condominium && location.condominium !== location.residencia) {
                  locationParts.push(location.condominium);
                }
                
                // Always add house number if available
                if (location.houseNumber) {
                  locationParts.push(`#${location.houseNumber}`);
                }
                
                (app as any).client_location = locationParts.length > 0 
                  ? locationParts.join(' - ') 
                  : 'Ubicación no especificada';
              } else {
                (app as any).client_location = 'Ubicación no especificada';
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
              console.log(`  - ${app.id}: "${app.client_name}" (original: "${app.client_name}")`);
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
