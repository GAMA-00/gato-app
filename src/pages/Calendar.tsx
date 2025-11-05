
import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { AvailabilityManager } from '@/components/calendar/AvailabilityManager';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';

import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedRecurringAppointments } from '@/hooks/useUnifiedRecurringAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { subWeeks, addWeeks } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  // Calcular rango: 4 semanas atrás a 52 semanas adelante (estable)
  const startDate = React.useMemo(() => subWeeks(new Date(), 4), []);
  const endDate = React.useMemo(() => addWeeks(new Date(), 52), []);

  const { data: appointments = [], isLoading } = useUnifiedRecurringAppointments({
    userId: user?.id,
    userRole: 'provider',
    startDate,
    endDate,
    includeCompleted: false
  });

  // Log controlado y filtrado de citas visibles (sin canceladas/rechazadas)
  const visibleAppointments = React.useMemo(
    () => (appointments || []).filter(a => !['cancelled', 'rejected'].includes(a.status)),
    [appointments]
  );

  // Fallback mensual simple si el unificado llega vacío
  const { data: fallbackMonthly = [] } = useCalendarAppointments(currentDate);
  const fallbackVisible = React.useMemo(
    () => (fallbackMonthly || []).filter(a => ['pending','confirmed'].includes(a.status)),
    [fallbackMonthly]
  );

  const finalAppointments = visibleAppointments.length > 0 ? visibleAppointments : fallbackVisible;

  React.useEffect(() => {
    console.log('Calendar unified count:', visibleAppointments.length, 'fallback count:', fallbackVisible.length, 'final:', finalAppointments.length);
  }, [visibleAppointments.length, fallbackVisible.length, finalAppointments.length]);

  if (isLoading) {
    return (
      <PageLayout title="Calendario" subtitle="Cargando citas..." contentClassName="max-w-7xl">
        <div className="w-full space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Calendario" 
      contentClassName="max-w-7xl" 
      className="bg-white"
      headerActions={user?.role === 'provider' ? (
        <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="default" className="flex items-center gap-2 text-xs px-3 py-2 h-auto">
              <Settings className="h-4 w-4" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs">Config.</span>
                <span className="text-xs">Disponibilidad</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Administrar Disponibilidad</DialogTitle>
            </DialogHeader>
            <AvailabilityManager />
          </DialogContent>
        </Dialog>
      ) : undefined}
    >
      <div className="space-y-6">

        {/* Show job requests for providers */}
        {user?.role === 'provider' && (
          <div className="w-full">
            <JobRequestsGrouped />
          </div>
        )}
        
        {/* Optimized Calendar view with recurring instances */}
        <div className="w-full">
          <CalendarView 
            appointments={finalAppointments} 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Calendar;
