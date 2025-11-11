import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X, MapPin, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/utils/logger';

interface JobRequestsProps {
  onAcceptRequest?: (request: any) => void;
  onDeclineRequest?: (requestId: string) => void;
}

const JobRequests: React.FC<JobRequestsProps> = ({
  onAcceptRequest,
  onDeclineRequest
}) => {
  const { data: appointments = [], isLoading, error } = useAppointments();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Only show component for providers
  if (user?.role !== 'provider') return null;
  
  // Filter pending requests
  const pendingRequests = appointments.filter((appointment: any) => 
    appointment.status === 'pending'
  );
  
  logger.debug("Pending requests in JobRequests component:", pendingRequests);
  logger.debug("All appointments:", appointments);
  
  const handleAccept = async (request: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', request.id);
        
      if (error) throw error;
      
      toast.success("Solicitud aceptada");
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };
  
  const handleDecline = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected' })
        .eq('id', requestId);
        
      if (error) throw error;
      
      toast.success("Solicitud rechazada");
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      
      if (onDeclineRequest) {
        onDeclineRequest(requestId);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre' || name === 'Cliente Externo') return 'CL';
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Solicitudes de Reserva
          </div>
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                {pendingRequests.length} pendiente{pendingRequests.length > 1 ? 's' : ''}
              </span>
              {pendingRequests.some(req => req.external_booking) && (
                <span className="text-sm bg-blue-50 text-blue-600 px-2 py-1 rounded-full flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  {pendingRequests.filter(req => req.external_booking).length} externa{pendingRequests.filter(req => req.external_booking).length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">
            <p>Error al cargar solicitudes</p>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => {
              const isExternal = request.external_booking;
              
              logger.debug(`Rendering request ${request.id}`, { 
                clientName: request.client_name, 
                isExternal, 
                location: request.client_location 
              });
              
              return (
                <div key={request.id} className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 border border-amber-200 flex-shrink-0">
                      <AvatarImage alt={request.client_name} />
                      <AvatarFallback className="bg-amber-100 text-amber-800">
                        {getInitials(request.client_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{request.client_name}</div>
                        {isExternal && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1 text-xs">
                            <ExternalLink className="h-3 w-3" />
                            Externa
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.listings?.title || 'Servicio'}
                      </div>
                      {/* Show contact info for external bookings */}
                      {isExternal && (request.client_phone || request.client_email) && (
                        <div className="text-xs text-blue-600 mt-1">
                          {request.client_phone && <div>Tel: {request.client_phone}</div>}
                          {request.client_email && <div>Email: {request.client_email}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-3">
                    <Table className="border-collapse">
                      <TableBody>
                        <TableRow className="border-0">
                          <TableCell className="p-1 pl-0 pr-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="p-1 text-sm">
                            <div>{format(new Date(request.start_time), 'PPP')}</div>
                            <div className="text-muted-foreground">
                              {format(new Date(request.start_time), 'h:mm a')} - {format(new Date(request.end_time), 'h:mm a')}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        <TableRow className="border-0">
                          <TableCell className="p-1 pl-0 pr-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="p-1 text-sm">
                            <div className="font-medium">
                              {request.client_location}
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {request.notes && (
                    <div className="text-sm bg-amber-100 p-3 rounded-md mb-3 overflow-hidden">
                      <span className="font-medium">Notas: </span> 
                      <span className="break-words">{request.notes}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2 mt-3">
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
              );
            })}
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
