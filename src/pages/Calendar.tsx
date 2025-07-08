
import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { useAuth } from '@/contexts/AuthContext';
import { useCalendarRecurringSystem } from '@/hooks/useCalendarRecurringSystem';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const currentDate = new Date();

  const { data: appointments = [], isLoading } = useCalendarRecurringSystem({
    selectedDate: currentDate,
    providerId: user?.id
  });

  const { blockedSlots, isLoading: slotsLoading } = useBlockedTimeSlots();

  // Debug information for calendar system
  console.log('🗓️ Calendar System Active:', {
    appointmentsCount: appointments.length,
    loading: isLoading,
    provider: user?.id,
    blockedSlots: blockedSlots.length
  });

  if (isLoading || slotsLoading) {
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
        
        {/* Optimized Calendar view with recurring instances and blocked slots */}
        <div className="w-full">
          <CalendarView appointments={appointments} blockedSlots={blockedSlots} />
        </div>
      </div>
    </PageLayout>
  );
};

export default Calendar;
