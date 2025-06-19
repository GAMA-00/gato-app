import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X, MapPin, Clock, ExternalLink, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useGroupedPendingRequests } from '@/hooks/useGroupedPendingRequests';

interface JobRequestsGroupedProps {
  onAcceptRequest?: (request: any) => void;
  onDeclineRequest?: (requestId: string) => void;
}

const JobRequestsGrouped: React.FC<JobRequestsGroupedProps> = ({
  onAcceptRequest,
  onDeclineRequest
}) => {
  const { data: groupedRequests = [], isLoading, isError } = useGroupedPendingRequests();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Only show component for providers
  if (user?.role !== 'provider') return null;
  
  console.log("Grouped requests in JobRequestsGrouped component:", groupedRequests);
  
  const handleAccept = async (request: any) => {
    try {
      console.log("Accepting request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Update all appointments in the group
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .in('id', request.appointment_ids);
        
      if (error) throw error;
      
      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} aceptada (${request.appointment_count} citas)`
        : "Solicitud aceptada"
      );
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      if (onAcceptRequest) {
        onAcceptRequest(request);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };
  
  const handleDecline = async (request: any) => {
    try {
      console.log("Declining request group:", request.id, "with appointments:", request.appointment_ids);
      
      // Update all appointments in the group
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected' })
        .in('id', request.appointment_ids);
        
      if (error) throw error;
      
      const isGroup = request.appointment_count > 1;
      toast.success(isGroup 
        ? `Serie de reservas ${request.recurrence_label?.toLowerCase()} rechazada`
        : "Solicitud rechazada"
      );
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] });
      
      if (onDeclineRequest) {
        onDeclineRequest(request.id);
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

  // Helper function to get recurrence display text
  const getRecurrenceDisplay = (request: any) => {
    const isGroup = request.appointment_count > 1;
    
    if (!isGroup) {
      return 'Una vez';
    }
    
    return request.recurrence_label || 'Recurrente';
  };

  const totalPendingCount = groupedRequests.reduce((sum, req) => sum + req.appointment_count, 0);
  const externalCount = groupedRequests.filter(req => req.is_external).length;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            Solicitudes de Reserva
          </div>
          {groupedRequests.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {groupedRequests.length} solicitud{groupedRequests.length > 1 ? 'es' : ''}
                {totalPendingCount > groupedRequests.length && (
                  <span className="ml-1">({totalPendingCount} citas)</span>
                )}
              </span>
              {externalCount > 0 && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <ExternalLink className="h-2.5 w-2.5" />
                  {externalCount} externa{externalCount > 1 ? 's' : ''}
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
        ) : isError ? (
          <div className="text-center py-6 text-red-500">
            <p>Error al cargar solicitudes</p>
          </div>
        ) : groupedRequests.length > 0 ? (
          <div className="space-y-4">
            {groupedRequests.map((request: any) => {
              const isGroup = request.appointment_count > 1;
              const isExternal = request.is_external;
              const recurrenceDisplay = getRecurrenceDisplay(request);
              
              console.log(`Rendering request ${request.id}: clientName="${request.client_name}", isGroup=${isGroup}, appointmentCount=${request.appointment_count}`);
              
              return (
                <div key={request.id} className="border rounded-lg p-4 bg-amber-50 border-amber-200 relative">
                  {/* Recurrence indicator positioned in top-right corner */}
                  <div className="absolute top-3 right-3">
                    <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 flex items-center gap-1 text-[10px] px-1 py-0">
                      <Repeat className="h-2.5 w-2.5" />
                      {recurrenceDisplay}
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-3 mb-3 pr-20">
                    <Avatar className="h-10 w-10 border border-amber-200 flex-shrink-0">
                      <AvatarImage alt={request.client_name} />
                      <AvatarFallback className="bg-amber-100 text-amber-800">
                        {getInitials(request.client_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        <div className="font-medium">{request.client_name}</div>
                        {isExternal && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1 text-[10px] px-1 py-0">
                            <ExternalLink className="h-2.5 w-2.5" />
                            Externa
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {request.service_name}
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
                            <div>
                              {isGroup ? 'Inicia: ' : ''}{format(new Date(request.start_time), 'PPP')}
                            </div>
                            <div className="text-muted-foreground">
                              {format(new Date(request.start_time), 'h:mm a')} - {format(new Date(request.end_time), 'h:mm a')}
                              {isGroup && (
                                <span className="text-green-600 ml-2">
                                  ({request.appointment_count} citas)
                                </span>
                              )}
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
                      onClick={() => handleDecline(request)}
                      variant="outline"
                      size="sm"
                      className="flex items-center border-red-200 hover:bg-red-50 text-red-600"
                    >
                      <X className="w-4 h-4 mr-1" /> Rechazar{isGroup ? ' Serie' : ''}
                    </Button>
                    <Button 
                      onClick={() => handleAccept(request)}
                      size="sm"
                      className="flex items-center bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-1" /> Aceptar{isGroup ? ' Serie' : ''}
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

export default JobRequestsGrouped;
