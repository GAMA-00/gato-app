
import React from 'react';
import { Clock, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
    <Card className="glassmorphism">
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-primary font-medium">
                        {appointment.clients?.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || 
                         appointment.providers?.profiles?.name?.split(' ').map((n: string) => n[0]).join('') || 
                         'U'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {appointment.clients?.profiles?.name || 
                         appointment.providers?.profiles?.name || 
                         'Usuario'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {appointment.listings?.title || 'Servicio'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm font-medium">
                      <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                      {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {appointment.apartment ? `Apt ${appointment.apartment}` : 'Sin apartamento'}
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
