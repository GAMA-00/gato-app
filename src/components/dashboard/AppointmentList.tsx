import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import AppointmentCard from './AppointmentCard';
import AppointmentListHeader from './AppointmentListHeader';
import { logger } from '@/utils/logger';
import { useRequestActions } from '@/hooks/useRequestActions';

interface AppointmentListProps {
  appointments: any[];
  title: string;
  icon?: React.ReactNode;
  emptyMessage?: string;
  isPending?: boolean;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  title,
  icon,
  emptyMessage = "No hay citas programadas",
  isPending = false
}) => {
  const { user } = useAuth();
  const { handleAccept, handleDecline, isLoading } = useRequestActions();
  
  logger.debug('AppointmentList rendering', { title, count: appointments?.length || 0 });
  
  // Filter out completed appointments for the "Today's appointments" list
  const filteredAppointments = (appointments || []).filter(appointment => {
    // For Today's appointments, filter out appointments that have ended
    if (title.includes("Hoy") || title.includes("Mañana")) {
      const now = new Date();
      const endTime = new Date(appointment.end_time);
      
      // Also filter out completed/cancelled/rejected appointments
      return endTime > now && 
        appointment.status !== 'completed' && 
        appointment.status !== 'cancelled' && 
        appointment.status !== 'rejected';
    }
    
    return true;
  });

  logger.debug('After filtering', { title, remainingCount: filteredAppointments.length });

  // Wrapper to convert single appointment to the request format expected by useRequestActions
  const handleAcceptAppointment = async (appointmentId: string) => {
    const appointment = filteredAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // Convert to request format with appointment_ids array
    const request = {
      id: appointmentId,
      appointment_ids: [appointmentId],
      appointment_count: 1,
      ...appointment
    };
    
    await handleAccept(request);
  };
  
  const handleRejectAppointment = async (appointmentId: string) => {
    const appointment = filteredAppointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    
    // Convert to request format with appointment_ids array
    const request = {
      id: appointmentId,
      appointment_ids: [appointmentId],
      appointment_count: 1,
      ...appointment
    };
    
    await handleDecline(request);
  };

  const externalCount = filteredAppointments.filter(app => app.is_external || app.external_booking).length;

  return (
    <Card className="glassmorphism mb-6">
      <AppointmentListHeader
        title={title}
        icon={icon}
        appointmentCount={filteredAppointments.length}
        externalCount={externalCount}
      />
      <CardContent>
        {filteredAppointments.length > 0 ? (
          <div className="divide-y">
            {filteredAppointments.map((appointment) => (
              <React.Fragment key={appointment.id}>
                <AppointmentCard
                  appointment={appointment}
                  user={user}
                  isPending={isPending}
                  onAccept={isPending ? handleAcceptAppointment : undefined}
                  onReject={isPending ? handleRejectAppointment : undefined}
                />
              </React.Fragment>
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
