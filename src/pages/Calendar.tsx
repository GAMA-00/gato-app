
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

  // NO filtrar aquí - ya se filtró en el hook
  const allAppointments = appointments;

  console.log(`Final appointments passed to CalendarView: ${allAppointments.length}`);

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
        
        {/* Debug information */}
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription>
            <div className="space-y-2">
              <h4 className="font-medium text-blue-800">Estado del calendario</h4>
              <p className="text-blue-600 text-sm">
                Total: {allAppointments.length} citas | 
                Regular: {regularAppointments.length} | 
                Recurrentes: {recurringInstances.length} | 
                Slots bloqueados: {blockedSlots.length}
              </p>
              {allAppointments.length === 0 && (
                <p className="text-red-600 text-sm font-medium">
                  ⚠️ No se encontraron citas. Verifica que existan citas en la base de datos para este proveedor.
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        {/* Mostrar información de citas recurrentes */}
        {recurringInstances.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription>
              <div className="space-y-2">
                <h4 className="font-medium text-green-800">Citas recurrentes activas</h4>
                <p className="text-green-600">
                  Se muestran {recurringInstances.length} cita{recurringInstances.length > 1 ? 's' : ''} recurrente{recurringInstances.length > 1 ? 's' : ''} 
                  junto con {regularAppointments.length} cita{regularAppointments.length > 1 ? 's' : ''} regular{regularAppointments.length > 1 ? 'es' : ''}.
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
          appointments={allAppointments} 
          currentDate={currentCalendarDate}
          onDateChange={setCurrentCalendarDate}
          blockedSlots={blockedSlots}
        />
      </div>
    </PageContainer>
  );
};

export default Calendar;
