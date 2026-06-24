
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildAppointmentLocation } from "@/utils/appointmentLocationHelper";

export function usePendingRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-requests', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'provider') {
        console.log("👤 Usuario no es proveedor, retornando array vacío");
        return [];
      }
      
      console.log("🚀 === INICIO CONSULTA PENDING REQUESTS ===");
      console.log("👤 Obteniendo solicitudes pendientes para proveedor:", user.id);
      
      try {
        // Consulta simple primero - obtener todas las citas pendientes para este proveedor
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
          .eq('status', 'pending')
          .order('start_time', { ascending: true });
          
        if (error) {
          console.error("❌ Error obteniendo citas pendientes:", error);
          throw error;
        }
        
        console.log("📊 Citas pendientes encontradas:", appointments?.length || 0);
        
        if (!appointments || appointments.length === 0) {
          console.log("📭 No se encontraron citas pendientes para proveedor:", user.id);
          return [];
        }
        
        // Procesar citas para agregar información del cliente con ubicación completa
        const processedAppointments = await Promise.all(
          appointments.map(async (appointment) => {
            console.log(`🔄 === PROCESANDO SOLICITUD PENDIENTE ${appointment.id} ===`);
            
            let clientInfo = null;

            // Obtener información del cliente si no es una reserva externa
            if (appointment.client_id && !appointment.external_booking) {
              console.log(`👤 Obteniendo datos COMPLETOS del cliente para client_id: ${appointment.client_id}`);
              
              // v1: users sin residencias/condominios (se usa cantón).
              const { data: clientData, error: clientError } = await supabase
                .from('users')
                .select(`id, name, phone, email, house_number`)
                .eq('id', appointment.client_id)
                .single();

              if (clientError) {
                console.error("❌ Error obteniendo datos del cliente para solicitud pendiente:", appointment.id, clientError);
              } else if (clientData) {
                clientInfo = clientData;
                console.log("🏠 === DATOS COMPLETOS DEL CLIENTE PARA SOLICITUD PENDIENTE ===");
                console.log('📋 Datos completos del cliente:', JSON.stringify(clientData, null, 2));
              }
            }

            // Construir ubicación usando el helper compartido
            const clientLocation = buildAppointmentLocation({
              appointment,
              clientData: clientInfo
            });

            // Manejar reservas externas
            const isExternal = appointment.external_booking || !appointment.client_id;

            const processed = {
              ...appointment,
              client_name: appointment.client_name || (isExternal 
                ? 'Cliente Externo'
                : (clientInfo?.name || 'Cliente sin nombre')),
              client_phone: isExternal 
                ? appointment.client_phone 
                : clientInfo?.phone,
              client_email: isExternal 
                ? appointment.client_email 
                : clientInfo?.email,
              client_location: clientLocation,
              is_external: isExternal,
              service_name: appointment.listings?.title || 'Servicio'
            };

            console.log(`✅ === SOLICITUD PENDIENTE PROCESADA ${appointment.id} ===`);
            console.log('📍 Ubicación final:', processed.client_location);
            console.log('🌍 Es externa:', processed.is_external);
            
            return processed;
          })
        );
        
        console.log(`🎯 === RESULTADOS FINALES PENDING REQUESTS ===`);
        console.log(`📊 Retornando ${processedAppointments.length} solicitudes pendientes procesadas`);
        processedAppointments.forEach(app => {
          console.log(`📍 Solicitud pendiente ${app.id}: "${app.client_location}"`);
        });
        
        return processedAppointments;
        
      } catch (error) {
        console.error("❌ Error en consulta de solicitudes pendientes:", error);
        throw error;
      }
    },
    enabled: !!user && user.role === 'provider',
    refetchInterval: 10000, // Verificar nuevas solicitudes cada 10 segundos
    retry: 3,
    staleTime: 5000 // Considerar datos obsoletos después de 5 segundos
  });
}
