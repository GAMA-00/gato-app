import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import WeeklyAgendaGrid from '@/components/calendar/WeeklyAgendaGrid';
import PendingRequestsCard from '@/components/calendar/PendingRequestsCard';
import { AvailabilityManager } from '@/components/calendar/AvailabilityManager';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedRecurringAppointments } from '@/hooks/useUnifiedRecurringAppointments';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { subWeeks, addWeeks } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const isProvider = user?.role === 'provider';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  // Vista mensual (carga perezosa de citas para el mes)
  const startDate = React.useMemo(() => subWeeks(new Date(), 4), []);
  const endDate = React.useMemo(() => addWeeks(new Date(), 52), []);
  const { data: appointments = [] } = useUnifiedRecurringAppointments({
    userId: user?.id,
    userRole: 'provider',
    startDate,
    endDate,
    includeCompleted: false,
  });
  const { data: fallbackMonthly = [] } = useCalendarAppointments(currentDate);
  const visibleAppointments = (appointments || []).filter(a => !['cancelled', 'rejected'].includes(a.status));
  const fallbackVisible = (fallbackMonthly || []).filter(a => ['pending', 'confirmed'].includes(a.status));
  const finalAppointments = visibleAppointments.length > 0 ? visibleAppointments : fallbackVisible;

  return (
    <PageLayout
      title="Tu agenda, bajo control"
      subtitle="Habilitá y bloqueá espacios en segundos"
      contentClassName="max-w-3xl"
      className="bg-white"
      headerActions={isProvider ? (
        <Dialog open={isAvailabilityOpen} onOpenChange={setIsAvailabilityOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-xs">Disponibilidad</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="
            w-full max-w-lg
            sm:max-w-lg sm:max-h-[85vh] sm:rounded-2xl
            max-sm:!fixed max-sm:!inset-0 max-sm:!top-0 max-sm:!left-0 max-sm:!translate-x-0 max-sm:!translate-y-0
            max-sm:!w-screen max-sm:!h-screen max-sm:!max-w-none max-sm:!rounded-none
            flex flex-col overflow-hidden p-0
          ">
            <DialogHeader className="flex-shrink-0 px-5 pt-5 pb-3 border-b">
              <DialogTitle className="text-base font-semibold">Administrar disponibilidad</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              <AvailabilityManager />
            </div>
          </DialogContent>
        </Dialog>
      ) : undefined}
    >
      {isProvider ? (
        <Tabs defaultValue="semana" className="w-full space-y-4">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mes</TabsTrigger>
          </TabsList>

          <TabsContent value="semana" className="space-y-6">
            <WeeklyAgendaGrid />
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wide text-foreground">
                ⏳ SOLICITUDES PENDIENTES
              </h2>
              <PendingRequestsCard />
            </div>
          </TabsContent>

          <TabsContent value="mes">
            <CalendarView
              appointments={finalAppointments}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <CalendarView
          appointments={finalAppointments}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />
      )}
    </PageLayout>
  );
};

export default Calendar;
