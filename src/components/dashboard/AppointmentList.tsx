import React from 'react';
import { Clock, Check, X, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

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
  const { user } = useAuth();
  
  console.log(`AppointmentList "${title}" received ${appointments?.length || 0} appointments:`, appointments);
  
  // Filter out completed appointments for the "Today's appointments" list
  const filteredAppointments = (appointments || []).filter(appointment => {
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

  console.log(`After filtering, ${filteredAppointments.length} appointments remain for "${title}"`);
  
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

  // Enhanced function to get the correct name based on user role
  const getDisplayName = (appointment: any) => {
    // If the user is a provider, show client name
    if (user?.role === 'provider') {
      if (appointment.client_name) {
        return appointment.client_name;
      }
      
      // Fallback for external bookings
      if (appointment.is_external || appointment.external_booking) {
        return 'Cliente Externo';
      }
      
      return 'Cliente sin nombre';
    } 
    // If the user is a client, show provider name
    else {
      if (appointment.provider_name) {
        return appointment.provider_name;
      }
      
      return 'Proveedor desconocido';
    }
  };

  // Helper function to get service name with fallback
  const getServiceName = (appointment: any) => {
    return appointment.listings?.title || 'Servicio';
  };

  // Enhanced location info function with consistent formatting
  const getLocationInfo = (appointment: any) => {
    // For external bookings, use the stored client_address
    if (appointment.is_external || appointment.external_booking) {
      return appointment.client_address || 'Ubicación no especificada';
    }
    
    // For internal bookings, build the full location format: Residencia - Condominio - Número de Casa
    let locationParts = [];
    
    // Add residencia name if available
    if (appointment.residencias?.name) {
      locationParts.push(appointment.residencias.name);
    } else if (appointment.residencia_id) {
      locationParts.push('Residencia registrada');
    }
    
    // Add condominium text if available
    if (appointment.client_condominium) {
      locationParts.push(appointment.client_condominium);
    } else if (appointment.condominiums?.name) {
      locationParts.push(appointment.condominiums.name);
    }
    
    // Add house/apartment number if available
    if (appointment.apartment) {
      locationParts.push(`Casa ${appointment.apartment}`);
    } else if (appointment.house_number) {
      locationParts.push(`Casa ${appointment.house_number}`);
    }
    
    // Return formatted location or fallback
    return locationParts.length > 0 
      ? locationParts.join(' - ') 
      : 'Ubicación no especificada';
  };

  // Enhanced contact info function
  const getContactInfo = (appointment: any) => {
    // For external bookings, prioritize stored contact info
    if (appointment.is_external || appointment.external_booking) {
      return appointment.client_phone || appointment.client_email || 'Sin contacto';
    }
    
    // For internal bookings, we don't have direct access to user phone/email in this context
    return null;
  };
  
  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre' || name === 'Proveedor desconocido' || name === 'Cliente Externo') {
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
        <div className="flex items-center gap-2">
          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
            {filteredAppointments.length} citas
          </span>
          {/* Show external bookings count if any */}
          {filteredAppointments.some(app => app.is_external || app.external_booking) && (
            <span className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              {filteredAppointments.filter(app => app.is_external || app.external_booking).length} externa{filteredAppointments.filter(app => app.is_external || app.external_booking).length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredAppointments.length > 0 ? (
          <div className="divide-y">
            {filteredAppointments.map((appointment) => {
              const displayName = getDisplayName(appointment);
              const serviceName = getServiceName(appointment);
              const isExternal = appointment.is_external || appointment.external_booking;
              const contactInfo = getContactInfo(appointment);
              
              console.log(`Rendering appointment ${appointment.id}:`, {
                displayName,
                serviceName,
                isExternal,
                status: appointment.status,
                location: getLocationInfo(appointment)
              });
              
              return (
                <div key={appointment.id} className="p-4 border-b last:border-0">
                  <div className="flex flex-col gap-3 mb-2">
                    <div className="flex items-center min-w-0">
                      <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                        <AvatarImage alt={displayName} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {getInitials(displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {displayName}
                          </h4>
                          {isExternal && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1 text-xs">
                              <ExternalLink className="h-3 w-3" />
                              Externa
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {serviceName}
                        </p>
                        {/* Show contact info for external bookings */}
                        {contactInfo && (
                          <p className="text-xs text-blue-600 truncate mt-0.5">
                            {contactInfo}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Time and location in separate rows for better mobile layout */}
                    <div className="space-y-2">
                      <div className="flex items-center text-sm font-medium">
                        <Clock className="h-3.5 w-3.5 mr-2 text-primary flex-shrink-0" />
                        <span>
                          {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-start text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="break-words leading-relaxed">
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
