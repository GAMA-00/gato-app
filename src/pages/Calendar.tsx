
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

  console.log('Calendar render state:', {
    user: user?.id,
    appointmentsLoading,
    blockedSlotsLoading,
    appointmentsCount: appointments.length,
    regularAppointmentsCount: regularAppointments.length,
    recurringInstancesCount: recurringInstances.length,
    blockedSlotsCount: blockedSlots.length,
    currentDate: currentCalendarDate.toISOString().split('T')[0]
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

  // Filtrar citas canceladas o rechazadas
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
        
        {/* Mostrar información de citas recurrentes */}
        {recurringInstances.length > 0 && (
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription>
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">Citas recurrentes activas</h4>
                <p className="text-blue-600">
                  Se muestran {recurringInstances.length} cita{recurringInstances.length > 1 ? 's' : ''} recurrente{recurringInstances.length > 1 ? 's' : ''} 
                  junto con {regularAppointments.length} cita{regularAppointments.length > 1 ? 's' : ''} regular{regularAppointments.length > 1 ? 'es' : ''}.
                  Las citas recurrentes bloquean automáticamente los horarios futuros.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Mostrar advertencias de conflicto si existen */}
        {conflicts.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription>
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Conflictos detectados</h4>
                <p className="text-yellow-600">
                  Se detectaron {conflicts.length} conflicto{conflicts.length > 1 ? 's' : ''} de horarios en tu calendario. 
                  Revisa las citas superpuestas.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
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
