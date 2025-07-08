
import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCalendarAppointments } from '@/hooks/useUnifiedCalendarAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const currentDate = new Date();

  const { data: appointments = [], isLoading } = useUnifiedCalendarAppointments({
    selectedDate: currentDate,
    providerId: user?.id
  });

  console.log('=== CALENDAR PAGE DEBUG ===');
  console.log(`Current date: ${format(currentDate, 'yyyy-MM-dd')}`);
  console.log(`User ID: ${user?.id}`);
  console.log(`User role: ${user?.role}`);
  console.log(`Appointments loaded: ${appointments.length}`);
  console.log(`Loading state: ${isLoading}`);
  if (appointments.length > 0) {
    console.log('First few appointments:', appointments.slice(0, 3));
  }
  console.log('===============================');

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
    <PageLayout title="Calendario" contentClassName="max-w-7xl" className="bg-white">
      <div className="space-y-6">
        {/* Show job requests for providers */}
        {user?.role === 'provider' && (
          <div className="w-full">
            <JobRequestsGrouped />
          </div>
        )}
        
        {/* Calendar view with all appointments including recurring instances */}
        <div className="w-full">
          <CalendarView appointments={appointments} />
        </div>
      </div>
    </PageLayout>
  );
};

export default Calendar;
