
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

const Calendar = () => {
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const { blockedSlots } = useBlockedTimeSlots();
  const { data: appointments = [], isLoading } = useCalendarAppointments(currentCalendarDate);
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect clients away from provider pages - REMOVED automatic redirect
  // Users should only be redirected if they explicitly access a provider-only route
  
  // Filter appointments - exclude cancelled and rejected appointments by default
  const filteredAppointments = appointments.filter((appointment: any) => {
    // Always exclude cancelled and rejected appointments from the calendar view
    return appointment.status !== 'cancelled' && appointment.status !== 'rejected';
  });

  // Log the appointments to debug
  React.useEffect(() => {
    console.log("Calendar appointments for date:", currentCalendarDate.toISOString());
    console.log("All appointments:", appointments);
    console.log("Pending appointments:", appointments.filter((app: any) => app.status === 'pending'));
    console.log("Confirmed appointments:", appointments.filter((app: any) => app.status === 'confirmed'));
  }, [appointments, currentCalendarDate]);

  // If user is not a provider, don't render this page (but don't redirect automatically)
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
        {/* Use the new PendingRequestsCard component */}
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
