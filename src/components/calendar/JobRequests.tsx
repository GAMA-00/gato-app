
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X, MapPin, Home, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface JobRequestsProps {
  onAcceptRequest?: (request: any) => void;
  onDeclineRequest?: (requestId: string) => void;
}

const JobRequests: React.FC<JobRequestsProps> = ({
  onAcceptRequest,
  onDeclineRequest
}) => {
  const { data: appointments = [], isLoading, isError } = useAppointments();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Only show component for providers
  if (user?.role !== 'provider') return null;
  
  // Filter pending appointments only
  const pendingRequests = appointments.filter((appointment: any) => 
    appointment.status === 'pending'
  );
  
  console.log("Pending requests in component:", pendingRequests);
  
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

  // Always render the section, even if there are no pending requests
  return (
    <Card className="mb-6">
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
        ) : isError ? (
          <div className="text-center py-6 text-red-500">
            <p>Error al cargar solicitudes</p>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <div key={request.id} className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-10 w-10 border border-amber-200">
                    <AvatarImage src={request.clients?.avatar_url} alt={request.clients?.name || 'Cliente'} />
                    <AvatarFallback className="bg-amber-100 text-amber-800">
                      {(request.clients?.name || 'C').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{request.clients?.name || 'Cliente'}</div>
                    <div className="text-sm text-muted-foreground">
                      {request.listings?.title || 'Servicio'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 mb-3 text-sm">
                  <div className="flex items-start">
                    <Clock className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <div>{format(new Date(request.start_time), 'PPP')}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(request.start_time), 'h:mm a')} - {format(new Date(request.end_time), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
                    <div>
                      <div>
                        {request.residencias?.name || 'Residencia no especificada'}
                      </div>
                      {(request.clients?.condominium_name || request.apartment) && (
                        <div className="text-muted-foreground">
                          {request.clients?.condominium_name && `${request.clients.condominium_name}, `}
                          {request.apartment && `Casa/Apto: ${request.apartment}`}
                          {request.clients?.house_number && ` #${request.clients.house_number}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {request.notes && (
                  <div className="text-sm bg-amber-100 p-2 rounded-md mb-3">
                    <span className="font-medium">Notas: </span> 
                    {request.notes}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 mt-2">
                  <Button 
                    onClick={() => handleDecline(request.id)}
                    variant="outline"
                    size="sm"
                    className="flex items-center border-red-200 hover:bg-red-50 text-red-600"
                  >
                    <X className="w-4 h-4 mr-1" /> Rechazar
                  </Button>
                  <Button 
                    onClick={() => handleAccept(request)}
                    size="sm"
                    className="flex items-center bg-green-600 hover:bg-green-700"
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
