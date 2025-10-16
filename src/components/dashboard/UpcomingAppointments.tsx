
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Appointment, Client, Service } from '@/lib/types';
import { MOCK_SERVICES, MOCK_CLIENTS } from '@/lib/data';
import { formatPhoneForDisplay } from '@/utils/phoneUtils';

interface AppointmentItemProps {
  appointment: Appointment;
  service: Service;
  client: Client;
}

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  service,
  client
}) => {
  // Helper function to get name initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  };

  // Get the appropriate display name based on appointment data
  let displayName = '';
  
  // For client view (looking at provider's name)
  if (appointment.providerId !== client.id && appointment.serviceName) {
    displayName = appointment.providerName || service.providerName || 'Proveedor desconocido';
  } 
  // For provider view (looking at client's name)
  else {
    displayName = appointment.clientName || client.name || 'Cliente sin nombre';
  }
  
  const initials = getInitials(displayName);

  return (
    <div className="px-2 py-3 flex items-center gap-3 border-b last:border-0 appointment-card">
      <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-primary text-sm font-medium">
          {initials}
        </span>
      </div>
      
      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium truncate">{service.name}</h4>
          <span 
            className="px-2 py-0.5 text-xs rounded-full"
            style={{ 
              backgroundColor: appointment.status === 'confirmed' 
                ? '#DCFCE7' 
                : '#F3F4F6',
              color: appointment.status === 'confirmed' 
                ? '#166534' 
                : '#4B5563'
            }}
          >
            {appointment.status === 'confirmed' ? 'Confirmada' : 'Programada'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground mt-1">
          <span className="truncate">
            {/* Show the appropriate name based on context */}
            {displayName} • {formatPhoneForDisplay(client.phone)}
          </span>
          <span className="truncate">
            {format(appointment.startTime, 'MMM d, h:mm a')} - {format(appointment.endTime, 'h:mm a')}
          </span>
        </div>
      </div>
    </div>
  );
};

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  limit?: number;
}

const UpcomingAppointments: React.FC<UpcomingAppointmentsProps> = ({
  appointments,
  limit = 5
}) => {
  // Sort appointments by startTime, ascending
  const sortedAppointments = [...appointments]
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
    .slice(0, limit);

  return (
    <Card className="glassmorphism">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Próximas Citas</CardTitle>
      </CardHeader>
      <CardContent>
        {sortedAppointments.length > 0 ? (
          <div className="divide-y">
            {sortedAppointments.map(appointment => {
              const service = MOCK_SERVICES.find(s => s.id === appointment.serviceId)!;
              const client = MOCK_CLIENTS.find(c => c.id === appointment.clientId)!;
              
              return (
                <AppointmentItem
                  key={appointment.id}
                  appointment={appointment}
                  service={service}
                  client={client}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay próximas citas</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingAppointments;
