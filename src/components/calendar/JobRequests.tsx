
import React from 'react';
import { Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment, Client, Service, RecurrencePattern, OrderStatus } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';

// Mock job requests (in a real app, this would come from props or API)
const JOB_REQUESTS = [
  {
    id: 'req-1',
    appointment: {
      id: 'pending-1',
      serviceId: '1',
      clientId: '1',
      providerId: 'provider-1',
      startTime: new Date(new Date().setHours(10, 0)),
      endTime: new Date(new Date().setHours(12, 0)),
      status: 'pending' as OrderStatus,
      recurrence: 'none' as RecurrencePattern,
      notes: 'Solicitud de cliente nuevo',
      createdAt: new Date(),
      building: 'Torre Norte',
      apartment: '703'
    }
  },
  {
    id: 'req-2',
    appointment: {
      id: 'pending-2',
      serviceId: '3',
      clientId: '2',
      providerId: 'provider-1',
      startTime: new Date(new Date().setHours(14, 30)),
      endTime: new Date(new Date().setHours(16, 0)),
      status: 'pending' as OrderStatus,
      recurrence: 'none' as RecurrencePattern,
      notes: 'Solicitud especial de limpieza',
      createdAt: new Date(),
      building: 'Edificio Azul',
      apartment: '1204'
    }
  }
];

interface JobRequestProps {
  request: {
    id: string;
    appointment: Appointment;
  };
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const JobRequestItem: React.FC<JobRequestProps> = ({ request, onAccept, onDecline }) => {
  const service = MOCK_SERVICES.find(s => s.id === request.appointment.serviceId)!;
  const client = MOCK_CLIENTS.find(c => c.id === request.appointment.clientId)!;
  const isMobile = useIsMobile();
  
  return (
    <div className="p-4 border-b last:border-b-0">
      {isMobile ? (
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-primary">{service.name}</h4>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
            <div className="bg-primary/10 text-primary text-xs font-medium rounded-full px-2 py-0.5">
              ${service.price}
            </div>
          </div>
          
          <div className="flex flex-col space-y-1">
            <div className="flex items-center text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <span className="font-medium">{format(request.appointment.startTime, 'EEE, MMM d')}</span>
              <span className="mx-1">•</span>
              <span>{format(request.appointment.startTime, 'h:mm a')} - {format(request.appointment.endTime, 'h:mm a')}</span>
            </div>
            <div className="bg-orange-100 text-orange-700 text-xs font-medium rounded-full px-2 py-0.5 self-start">
              {request.appointment.building} - #{request.appointment.apartment}
            </div>
          </div>
          
          {request.appointment.notes && (
            <div className="text-sm bg-muted/50 p-2 rounded-md">
              <span className="font-medium">Nota:</span> {request.appointment.notes}
            </div>
          )}
          
          <div className="flex gap-2 pt-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDecline(request.id)}
            >
              <X className="h-4 w-4 mr-1" />
              Rechazar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={() => onAccept(request.id)}
            >
              <Check className="h-4 w-4 mr-1" />
              Aceptar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-medium text-primary">{service.name}</h4>
              <p className="text-sm text-muted-foreground">{client.name}</p>
            </div>
            <div className="text-sm text-right">
              <div className="font-medium">{format(request.appointment.startTime, 'EEE, MMM d')}</div>
              <div className="text-muted-foreground">
                {format(request.appointment.startTime, 'h:mm a')} - {format(request.appointment.endTime, 'h:mm a')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center mt-3">
            <div className="bg-primary/10 text-primary text-xs font-medium rounded-full px-2 py-0.5 mr-2">
              ${service.price}
            </div>
            <div className="bg-orange-100 text-orange-700 text-xs font-medium rounded-full px-2 py-0.5">
              {request.appointment.building} - #{request.appointment.apartment}
            </div>
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={() => onDecline(request.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                onClick={() => onAccept(request.id)}
              >
                <Check className="h-4 w-4 mr-1" />
                Aceptar
              </Button>
            </div>
          </div>
          
          {request.appointment.notes && (
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="font-medium">Nota:</span> {request.appointment.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface JobRequestsProps {
  onAcceptRequest: (request: any) => void;
  onDeclineRequest: (requestId: string) => void;
}

const JobRequests: React.FC<JobRequestsProps> = ({ 
  onAcceptRequest,
  onDeclineRequest 
}) => {
  const handleAccept = (requestId: string) => {
    const request = JOB_REQUESTS.find(req => req.id === requestId);
    if (request) {
      onAcceptRequest(request);
    }
  };
  
  const handleDecline = (requestId: string) => {
    onDeclineRequest(requestId);
  };
  
  if (JOB_REQUESTS.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-orange-500" />
            Solicitudes de Servicio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            No hay solicitudes pendientes en este momento
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-orange-500" />
          Solicitudes de Servicio ({JOB_REQUESTS.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {JOB_REQUESTS.map(request => (
          <JobRequestItem
            key={request.id}
            request={request}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        ))}
      </CardContent>
    </Card>
  );
};

export default JobRequests;
