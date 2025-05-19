
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

  return (
    <Card className="glassmorphism mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl flex items-center">
          {icon}
          {title}
        </CardTitle>
        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
          {appointments.length} citas
        </span>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="divide-y">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="p-4 border-b last:border-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
                      <AvatarImage 
                        src={appointment.clients?.avatar_url || appointment.providers?.avatar_url} 
                        alt={appointment.clients?.name || appointment.providers?.name || 'Usuario'} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(appointment.clients?.name?.charAt(0) || 
                          appointment.providers?.name?.charAt(0) || 
                          'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate">
                        {appointment.clients?.name || 
                         appointment.providers?.name || 
                         'Usuario'}
                      </h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {appointment.listings?.title || 'Servicio'}
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
                      <span className="truncate">
                        {appointment.residencias?.name || 'Sin residencia'}
                        {appointment.apartment ? `, Apt ${appointment.apartment}` : ''}
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
            ))}
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
