
import React, { useState } from 'react';
import { Check, X, Calendar, MapPin } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment, Client, Service, RecurrencePattern, OrderStatus } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';

// Use localStorage for job requests
const getJobRequests = () => {
  try {
    const savedAppointments = localStorage.getItem('gato_appointments');
    if (!savedAppointments) return [];
    
    const appointments = JSON.parse(savedAppointments, (key, value) => {
      if (key === 'startTime' || key === 'endTime' || key === 'createdAt') {
        return new Date(value);
      }
      return value;
    });
    
    // Filter pending appointments (requests)
    const requests = appointments
      .filter((app: any) => app.status === 'pending')
      .map((app: any) => ({
        id: app.id,
        appointment: app
      }));
      
    return requests;
  } catch (error) {
    console.error('Error parsing appointments:', error);
    return [];
  }
};

const formatTimeSlot = (startTime: Date, endTime: Date) => {
  return (
    <div className="flex flex-col">
      <div className="text-sm font-medium">
        {format(startTime, "d 'de' MMMM", { locale: es })}
      </div>
      <div className="text-xs text-muted-foreground">
        {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
      </div>
    </div>
  );
};

interface JobRequestProps {
  request: {
    id: string;
    appointment: Appointment;
  };
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const JobRequestItem: React.FC<JobRequestProps> = ({ request, onAccept, onDecline }) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const service = MOCK_SERVICES.find(s => s.id === request.appointment.serviceId) || {
    name: request.appointment.serviceName || 'Servicio',
    price: 0,
  };
  const client = MOCK_CLIENTS.find(c => c.id === request.appointment.clientId) || {
    name: request.appointment.clientName || 'Cliente',
    address: request.appointment.building || '',
  };
  const isMobile = useIsMobile();
  
  const handleAccept = async () => {
    setProcessing('accept');
    try {
      await onAccept(request.id);
    } finally {
      setProcessing(null);
    }
  };
  
  const handleDecline = async () => {
    setProcessing('decline');
    try {
      await onDecline(request.id);
    } finally {
      setProcessing(null);
    }
  };
  
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
              {formatTimeSlot(
                request.appointment.startTime,
                request.appointment.endTime
              )}
            </div>
            <div className="flex items-center text-sm">
              <MapPin className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <span className="text-xs text-orange-700 font-medium">
                {request.appointment.building} {request.appointment.apartment && `- #${request.appointment.apartment}`}
              </span>
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
              onClick={handleDecline}
              disabled={!!processing}
            >
              <X className="h-4 w-4 mr-1" />
              {processing === 'decline' ? 'Procesando...' : 'Rechazar'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
              onClick={handleAccept}
              disabled={!!processing}
            >
              <Check className="h-4 w-4 mr-1" />
              {processing === 'accept' ? 'Procesando...' : 'Aceptar'}
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
              {formatTimeSlot(
                request.appointment.startTime,
                request.appointment.endTime
              )}
            </div>
          </div>
          
          <div className="flex items-center mt-3">
            <div className="bg-primary/10 text-primary text-xs font-medium rounded-full px-2 py-0.5 mr-2">
              ${service.price}
            </div>
            <div className="bg-orange-100 text-orange-700 text-xs font-medium rounded-full px-2 py-0.5">
              {request.appointment.building} {request.appointment.apartment && `- #${request.appointment.apartment}`}
            </div>
            <div className="ml-auto flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                onClick={handleDecline}
                disabled={!!processing}
              >
                <X className="h-4 w-4 mr-1" />
                {processing === 'decline' ? 'Procesando...' : 'Rechazar'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                onClick={handleAccept}
                disabled={!!processing}
              >
                <Check className="h-4 w-4 mr-1" />
                {processing === 'accept' ? 'Procesando...' : 'Aceptar'}
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
  const [jobRequests, setJobRequests] = useState(() => getJobRequests());
  
  const handleAccept = async (requestId: string) => {
    const request = jobRequests.find(req => req.id === requestId);
    if (request) {
      try {
        // Update status in localStorage
        const savedAppointments = localStorage.getItem('gato_appointments');
        if (savedAppointments) {
          const appointments = JSON.parse(savedAppointments, (key, value) => {
            if (key === 'startTime' || key === 'endTime' || key === 'createdAt') {
              return new Date(value);
            }
            return value;
          });
          
          const updatedAppointments = appointments.map((app: any) => {
            if (app.id === requestId) {
              return { ...app, status: 'confirmed' };
            }
            return app;
          });
          
          localStorage.setItem('gato_appointments', JSON.stringify(updatedAppointments));
        }
        
        // Remove from job requests list
        setJobRequests(prev => prev.filter(r => r.id !== requestId));
        
        // Call parent handler
        onAcceptRequest(request);
        
        return Promise.resolve();
      } catch (error) {
        console.error('Error accepting request:', error);
        return Promise.reject(error);
      }
    }
  };
  
  const handleDecline = async (requestId: string) => {
    try {
      // Update status in localStorage
      const savedAppointments = localStorage.getItem('gato_appointments');
      if (savedAppointments) {
        const appointments = JSON.parse(savedAppointments, (key, value) => {
          if (key === 'startTime' || key === 'endTime' || key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        
        const updatedAppointments = appointments.map((app: any) => {
          if (app.id === requestId) {
            return { ...app, status: 'rejected' };
          }
          return app;
        });
        
        localStorage.setItem('gato_appointments', JSON.stringify(updatedAppointments));
      }
      
      // Remove from job requests list
      setJobRequests(prev => prev.filter(r => r.id !== requestId));
      
      // Call parent handler
      onDeclineRequest(requestId);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error declining request:', error);
      return Promise.reject(error);
    }
  };
  
  if (jobRequests.length === 0) {
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
          Solicitudes de Servicio ({jobRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {jobRequests.map(request => (
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
