
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface JobRequestsProps {
  onAcceptRequest?: (request: any) => void;
  onDeclineRequest?: (requestId: string) => void;
}

const JobRequests: React.FC<JobRequestsProps> = ({
  onAcceptRequest,
  onDeclineRequest
}) => {
  const { data: appointments = [], isLoading } = useAppointments();
  const queryClient = useQueryClient();
  
  // Filter pending appointments only
  const pendingRequests = appointments.filter((appointment: any) => 
    appointment.status === 'pending'
  );
  
  const handleAccept = async (request: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', request.id);
        
      if (error) throw error;
      
      toast({
        title: "Solicitud aceptada",
        description: "La cita ha sido agregada a tu calendario.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  const handleDecline = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      toast({
        title: "Solicitud rechazada",
        description: "La solicitud ha sido rechazada.",
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      if (onDeclineRequest) {
        onDeclineRequest(requestId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  
  // If there are no pending requests, don't render this component
  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Solicitudes de Reserva
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center my-4">
            <span className="loading loading-spinner"></span>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <div key={request.id} className="border rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{request.listings?.title || 'Servicio'}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(request.start_time), 'PPP')}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">
                    {request.clients?.profiles?.name || 'Cliente'}
                  </span>
                  <span className="text-sm">
                    {format(new Date(request.start_time), 'h:mm a')} - {format(new Date(request.end_time), 'h:mm a')}
                  </span>
                </div>
                {request.notes && (
                  <div className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium">Notas: </span> 
                    {request.notes}
                  </div>
                )}
                <div className="flex justify-end space-x-2 mt-2">
                  <Button 
                    onClick={() => handleDecline(request.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleAccept(request)}
                    size="sm"
                    className="flex items-center"
                  >
                    <Check className="w-4 h-4 mr-1" /> Aceptar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No hay solicitudes pendientes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobRequests;
