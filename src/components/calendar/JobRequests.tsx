
import React from 'react';
import { Check, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Appointment, Client, Service, RecurrencePattern } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS } from '@/lib/data';

// Mock job requests (in a real app, this would come from props or API)
const JOB_REQUESTS = [
  {
    id: 'req-1',
    appointment: {
      id: 'pending-1',
      serviceId: '1',
      clientId: '1',
      startTime: new Date(new Date().setHours(10, 0)),
      endTime: new Date(new Date().setHours(12, 0)),
      status: 'pending',
      recurrence: 'none' as RecurrencePattern,
      notes: 'New client request',
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
      startTime: new Date(new Date().setHours(14, 30)),
      endTime: new Date(new Date().setHours(16, 0)),
      status: 'pending',
      recurrence: 'none' as RecurrencePattern,
      notes: 'Special cleaning request',
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
  
  return (
    <div className="p-4 border-b last:border-b-0">
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
            Decline
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
            onClick={() => onAccept(request.id)}
          >
            <Check className="h-4 w-4 mr-1" />
            Accept
          </Button>
        </div>
      </div>
      
      {request.appointment.notes && (
        <div className="mt-2 text-sm text-muted-foreground">
          <span className="font-medium">Note:</span> {request.appointment.notes}
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
            Job Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-6">
            No pending job requests at the moment
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
          Job Requests ({JOB_REQUESTS.length})
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
