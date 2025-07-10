
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Clock, MapPin, ExternalLink, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import RequestActions from './RequestActions';

interface RequestCardProps {
  request: any;
  onAccept: (request: any) => void;
  onDecline: (request: any) => void;
  isLoading?: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onAccept, onDecline, isLoading = false }) => {
  const isGroup = request.appointment_count > 1;
  const isExternal = request.is_external;

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

  const recurrenceDisplay = getRecurrenceDisplay(request);

  return (
    <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 relative">
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
      
      <RequestActions 
        request={request}
        onAccept={onAccept}
        onDecline={onDecline}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RequestCard;
