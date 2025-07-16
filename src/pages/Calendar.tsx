
import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { AvailabilityManager } from '@/components/calendar/AvailabilityManager';

import { useAuth } from '@/contexts/AuthContext';
import { useRecurringSlotSystem } from '@/hooks/useRecurringSlotSystem';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';
import { format } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAvailabilityOpen, setIsAvailabilityOpen] = useState(false);

  const { data: appointments = [], isLoading, refetch } = useRecurringSlotSystem({
    selectedDate: currentDate,
    providerId: user?.id
  });

  // Force refresh to see the updated data after migration
  React.useEffect(() => {
    if (user?.id) {
      refetch();
    }
  }, [user?.id, refetch]);

  

  // Only log on significant changes
  React.useEffect(() => {
    if (appointments.length > 0) {
      console.log('Calendar loaded with', appointments.length, 'appointments');
    }
  }, [appointments.length]);

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
            <Button variant="outline" size="default" className="flex flex-col items-center gap-1 text-xs px-3 py-2 h-auto min-h-[3rem]">
              <Settings className="h-4 w-4" />
              <div className="flex flex-col items-center leading-tight">
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
            appointments={appointments} 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Calendar;
