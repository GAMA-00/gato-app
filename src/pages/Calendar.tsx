
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import PendingRequestsCard from '@/components/calendar/PendingRequestsCard';
import BlockedTimeSlots from '@/components/calendar/BlockedTimeSlots';
import { useCalendarAppointmentsWithRecurring } from '@/hooks/useCalendarAppointmentsWithRecurring';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Calendar = () => {
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  console.log('=== CALENDAR PAGE RENDER ===');
  console.log(`User ID: ${user?.id}`);
  console.log(`User role: ${user?.role}`);
  console.log(`Current date: ${currentCalendarDate.toISOString()}`);
  
  // Early return for non-providers
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

  // Hooks para obtener datos
  const { 
    data: appointments = [], 
    isLoading: appointmentsLoading, 
    conflicts = [],
    regularAppointments = [],
    recurringInstances = []
  } = useCalendarAppointmentsWithRecurring({
    selectedDate: currentCalendarDate,
    providerId: user?.id
  });
  
  const { 
    blockedSlots = [], 
    isLoading: blockedSlotsLoading,
    refetch: refetchBlockedSlots 
  } = useBlockedTimeSlots();

  console.log('=== CALENDAR PAGE DATA ===');
  console.log(`Appointments loading: ${appointmentsLoading}`);
  console.log(`Blocked slots loading: ${blockedSlotsLoading}`);
  console.log(`Total appointments: ${appointments.length}`);
  console.log(`Regular appointments: ${regularAppointments.length}`);
  console.log(`Recurring instances: ${recurringInstances.length}`);
  console.log(`Blocked slots: ${blockedSlots.length}`);
  console.log('============================');

  // Loading state
  if (appointmentsLoading || blockedSlotsLoading) {
    return (
      <PageContainer title="Calendario" subtitle="Administra tu agenda y citas">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Cargando calendario...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Filter out completed appointments - only show pending appointments and blocked slots
  const pendingAppointments = appointments.filter(appointment => 
    appointment.status !== 'completed' && 
    appointment.status !== 'cancelled' && 
    appointment.status !== 'rejected'
  );

  console.log(`Filtered pending appointments: ${pendingAppointments.length} out of ${appointments.length}`);

  return (
    <PageContainer 
      title="Calendario" 
      subtitle="Administra tu agenda y citas"
      action={
        <Button 
          variant="outline" 
          onClick={() => setShowBlockedTimeSlots(!showBlockedTimeSlots)}
        >
          {showBlockedTimeSlots ? 'Ocultar Horarios Bloqueados' : 'Gestionar Disponibilidad'}
        </Button>
      }
    >
      <div className="space-y-6">
        <PendingRequestsCard />
        
        {showBlockedTimeSlots && <BlockedTimeSlots />}
        
        <CalendarView 
          appointments={pendingAppointments} 
          currentDate={currentCalendarDate}
          onDateChange={setCurrentCalendarDate}
          blockedSlots={blockedSlots}
        />
      </div>
    </PageContainer>
  );
};

export default Calendar;
