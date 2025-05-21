
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Check, X, MapPin, Clock, Home, Building } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAppointments } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

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
  
  // Solo mostrar componente para proveedores
  if (user?.role !== 'provider') return null;
  
  // Filtrar solicitudes pendientes
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
      
      toast.success("Solicitud aceptada");
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
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
      
      if (onDeclineRequest) {
        onDeclineRequest(requestId);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // Función para obtener el nombre del cliente con sistema de fallback mejorado
  const getClientName = (request: any) => {
    // 1. Primero intentamos con la columna client_name
    if (request.client_name) {
      return request.client_name;
    }
    
    // 2. Fallback final
    return 'Cliente sin nombre';
  };

  // Función auxiliar para obtener las iniciales del nombre
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre') return 'CL';
    
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
        <CardTitle className="text-lg flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Solicitudes de Reserva
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
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => {
              const clientName = getClientName(request);
              console.log("Request data:", request); // Log para depuración
              
              return (
                <div key={request.id} className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="h-10 w-10 border border-amber-200 flex-shrink-0">
                      <AvatarImage alt={clientName} />
                      <AvatarFallback className="bg-amber-100 text-amber-800">
                        {getInitials(clientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {request.listings?.title || 'Servicio'}
                      </div>
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
                            <Building className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="p-1 text-sm">
                            <div className="font-medium">
                              {request.residencias?.name || 'Residencial no especificada'}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Información del apartamento */}
                        {request.apartment && (
                          <TableRow className="border-0">
                            <TableCell className="p-1 pl-0 pr-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="p-1 text-sm space-y-1">
                              <div className="text-muted-foreground">
                                Apto: {request.apartment}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
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
