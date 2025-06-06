
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
import { Loader2 } from 'lucide-react';

const Calendar = () => {
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

  // Hooks for data fetching
  const { 
    data: appointments = [], 
    isLoading: appointmentsLoading, 
    error: appointmentsError, 
    refetch: refetchAppointments 
  } = useCalendarAppointments(currentCalendarDate);
  
  const { 
    blockedSlots = [], 
    isLoading: blockedSlotsLoading,
    refetch: refetchBlockedSlots 
  } = useBlockedTimeSlots();

  console.log('Calendar render state:', {
    user: user?.id,
    appointmentsLoading,
    blockedSlotsLoading,
    appointmentsError,
    appointmentsCount: appointments.length,
    blockedSlotsCount: blockedSlots.length
  });

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

  // Error state
  if (appointmentsError) {
    console.error("Calendar error:", appointmentsError);
    return (
      <PageContainer title="Calendario" subtitle="Administra tu agenda y citas">
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-800">Error al cargar el calendario</h4>
                <p className="text-red-600 mt-1">
                  No se pudieron cargar las citas. Por favor, intenta nuevamente.
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => refetchAppointments()} 
                  variant="outline" 
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Reintentar
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Recargar página
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  // Filter out cancelled and rejected appointments
  const filteredAppointments = appointments.filter((appointment: any) => {
    return appointment.status !== 'cancelled' && appointment.status !== 'rejected';
  });

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
