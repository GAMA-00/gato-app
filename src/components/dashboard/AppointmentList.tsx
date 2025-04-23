
import React from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AppointmentListProps {
  appointments: any[];
  title: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  title,
  icon,
  emptyMessage = "No hay citas programadas"
}) => {
  return (
    <Card className="glassmorphism">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl flex items-center">
          {icon}
          {title}
        </CardTitle>
        <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
          {appointments.length} citas
        </span>
      </CardHeader>
      <CardContent>
        {appointments.length > 0 ? (
          <div className="divide-y">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="p-4 border-b last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="text-primary font-medium">
                        {appointment.profiles?.name?.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{appointment.profiles?.name}</h4>
                      <p className="text-sm text-muted-foreground">{appointment.services?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-sm font-medium">
                      <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
                      {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {appointment.apartment ? `Apt ${appointment.apartment}` : 'Sin apartamento'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentList;
