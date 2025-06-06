
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import PendingRequestsCard from '@/components/calendar/PendingRequestsCard';
import BlockedTimeSlots from '@/components/calendar/BlockedTimeSlots';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Calendar = () => {
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const { blockedSlots, isLoading: blockedSlotsLoading } = useBlockedTimeSlots();
  const { data: appointments = [], isLoading: appointmentsLoading, error, refetch } = useCalendarAppointments(currentCalendarDate);
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // If user is not a provider, don't render this page
  if (user && user.role !== 'provider') {
    return (
      <PageContainer title="Acceso restringido">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Esta página está disponible solo para proveedores de servicios.</p>
          <Button onClick={() => navigate('/client')} className="mt-4">
            Ir a servicios
          </Button>
        </div>
      </PageContainer>
    );
  }

  // Show loading state
  if (appointmentsLoading || blockedSlotsLoading) {
    return (
      <PageContainer title="Calendario" subtitle="Administra tu agenda y citas">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-96 bg-muted rounded-lg" />
        </div>
      </PageContainer>
    );
  }

  // Show error state with retry option
  if (error) {
    console.error("Calendar error:", error);
    return (
      <PageContainer title="Calendario" subtitle="Administra tu agenda y citas">
        <Alert className="mb-6">
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p>Hubo un problema cargando el calendario.</p>
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer">Detalles del error</summary>
                  <div className="mt-1 text-muted-foreground">
                    {error.message || 'Error desconocido'}
                  </div>
                </details>
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                Reintentar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  // Filter appointments - exclude cancelled and rejected
  const filteredAppointments = appointments.filter((appointment: any) => {
    return appointment.status !== 'cancelled' && appointment.status !== 'rejected';
  });

  // Debug log for calendar
  React.useEffect(() => {
    console.log("=== CALENDAR DEBUG INFO ===");
    console.log("Current date:", currentCalendarDate.toISOString());
    console.log("Total appointments:", appointments.length);
    console.log("Filtered appointments:", filteredAppointments.length);
    console.log("Blocked slots:", blockedSlots.length);
    
    // Log appointment breakdown
    const breakdown = {
      pending: appointments.filter(app => app.status === 'pending').length,
      confirmed: appointments.filter(app => app.status === 'confirmed').length,
      completed: appointments.filter(app => app.status === 'completed').length,
      recurring: appointments.filter(app => app.is_recurring_instance).length,
      external: appointments.filter(app => app.external_booking).length,
      cancelled: appointments.filter(app => app.status === 'cancelled').length,
      rejected: appointments.filter(app => app.status === 'rejected').length
    };
    console.log("Appointment breakdown:", breakdown);
    console.log("==========================");
  }, [appointments, filteredAppointments, blockedSlots, currentCalendarDate]);

  return (
    <PageContainer 
      title="Calendario" 
      subtitle="Administra tu agenda y citas"
      action={
        <Button variant="outline" onClick={() => setShowBlockedTimeSlots(!showBlockedTimeSlots)}>
          {showBlockedTimeSlots ? 'Ocultar Horarios Bloqueados' : 'Gestionar Disponibilidad'}
        </Button>
      }
    >
      <div className="space-y-6">
        <PendingRequestsCard />
        
        {showBlockedTimeSlots && <BlockedTimeSlots />}
        
        <CalendarView 
          appointments={filteredAppointments} 
          currentDate={currentCalendarDate}
          onDateChange={setCurrentCalendarDate}
          blockedSlots={blockedSlots}
        />
      </div>
    </PageContainer>
  );
};

export default Calendar;
