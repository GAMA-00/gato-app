
import React from 'react';
import { Clock, Check, X, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AppointmentListProps {
  appointments: any[];
  title: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  isPending?: boolean;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  title,
  icon,
  emptyMessage = "No hay citas programadas",
  isPending = false
}) => {
  const queryClient = useQueryClient();
  
  // Filter out completed appointments for the "Today's appointments" list
  const filteredAppointments = appointments.filter(appointment => {
    // For Today's appointments, filter out appointments that have ended
    if (title.includes("Hoy") || title.includes("Mañana")) {
      const now = new Date();
      const endTime = new Date(appointment.end_time);
      
      // Also filter out completed/cancelled/rejected appointments
      return endTime > now && 
        appointment.status !== 'completed' && 
        appointment.status !== 'cancelled' && 
        appointment.status !== 'rejected';
    }
    
    return true;
  });
  
  const handleAcceptAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed'
        })
        .eq('id', appointmentId);
        
      if (error) throw error;
      
      toast.success("Cita confirmada con éxito");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error: any) {
      toast.error("Error al confirmar cita: " + error.message);
    }
  };
  
  const handleRejectAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'rejected'
        })
        .eq('id', appointmentId);
        
      if (error) throw error;
      
      toast.success("Cita rechazada");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    } catch (error: any) {
      toast.error("Error al rechazar cita: " + error.message);
    }
  };

  // Helper function to get client name with fallback
  const getClientName = (appointment: any) => {
    // 1. Primero intentamos con la columna client_name
    if (appointment.client_name) {
      return appointment.client_name;
    }
    
    // 2. Luego buscamos en el objeto clients anidado
    if (appointment.clients?.name) {
      return appointment.clients.name;
    }

    // 3. Fallback final
    return 'Cliente sin nombre';
  };

  // Helper function to get provider name with fallback
  const getProviderName = (appointment: any) => {
    // 1. Primero intentamos con la columna provider_name
    if (appointment.provider_name) {
      return appointment.provider_name;
    }
    
    // 2. Luego buscamos en el objeto providers anidado
    if (appointment.providers?.name) {
      return appointment.providers.name;
    }

    // 3. Fallback final
    return 'Proveedor desconocido';
  };

  // Helper function to get service name with fallback
  const getServiceName = (appointment: any) => {
    return appointment.listings?.title || 'Servicio';
  };

  // Helper function to get condominium and house information
  const getLocationInfo = (appointment: any) => {
    let locationInfo = [];
    
    // Add residencia name if available
    if (appointment.residencias?.name) {
      locationInfo.push(appointment.residencias.name);
    }
    
    // Add condominium name if available
    if (appointment.clients?.condominiums?.name) {
      locationInfo.push(`${appointment.clients.condominiums.name} (condominio)`);
    }
    
    // Add house number if available
    if (appointment.clients?.house_number) {
      locationInfo.push(`#${appointment.clients.house_number} (Numero de casa)`);
    }
    
    // Add apartment number if available
    if (appointment.apartment) {
      locationInfo.push(`Apt ${appointment.apartment}`);
    }
    
    return locationInfo.length > 0 
      ? locationInfo.join(' - ') 
      : 'Sin ubicación específica';
  };
  
  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre' || name === 'Proveedor desconocido') {
      return 'U';
    }
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="glassmorphism mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl flex items-center">
          {icon}
          {title}
        </CardTitle>
        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
          {filteredAppointments.length} citas
        </span>
      </CardHeader>
      <CardContent>
        {filteredAppointments.length > 0 ? (
          <div className="divide-y">
            {filteredAppointments.map((appointment) => {
              console.log("Appointment in list:", appointment); // Log para depuración
              const displayName = getClientName(appointment);
              const serviceName = getServiceName(appointment);
              
              return (
                <div key={appointment.id} className="p-4 border-b last:border-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                    <div className="flex items-center min-w-0">
                      <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                        <AvatarImage 
                          src={appointment.clients?.avatar_url || '/placeholder.svg'} 
                          alt={displayName} 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium truncate">
                          {displayName}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {serviceName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 mr-1 text-primary flex-shrink-0" />
                        <span className="truncate">
                          {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {getLocationInfo(appointment)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isPending && (
                    <div className="flex justify-end space-x-2 mt-3">
                      <Button 
                        onClick={() => handleRejectAppointment(appointment.id)} 
                        size="sm" 
                        variant="outline" 
                        className="flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Rechazar
                      </Button>
                      <Button 
                        onClick={() => handleAcceptAppointment(appointment.id)} 
                        size="sm" 
                        variant="default" 
                        className="flex items-center"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Aceptar
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentList;
