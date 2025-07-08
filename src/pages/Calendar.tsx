
import React from 'react';
import PageLayout from '@/components/layout/PageLayout';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedCalendarAppointments } from '@/hooks/useOptimizedCalendarAppointments';
import { useBlockedTimeSlots } from '@/hooks/useBlockedTimeSlots';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const Calendar = () => {
  const { user } = useAuth();
  const currentDate = new Date();

  const { data: appointments = [], isLoading } = useOptimizedCalendarAppointments({
    selectedDate: currentDate,
    providerId: user?.id
  });

  const { blockedSlots, isLoading: slotsLoading } = useBlockedTimeSlots();

  console.log('🗓️ === OPTIMIZED CALENDAR DEBUG ===');
  console.log(`Current date: ${format(currentDate, 'yyyy-MM-dd')}`);
  console.log(`User ID: ${user?.id}`);
  console.log(`User role: ${user?.role}`);
  console.log(`Appointments loaded: ${appointments.length}`);
  console.log(`Loading state: ${isLoading}`);
  console.log(`Blocked slots: ${blockedSlots.length}`);
  
  if (appointments.length > 0) {
    console.log('📋 Sample appointments:');
    appointments.slice(0, 5).forEach((apt: any, i) => {
      console.log(`  ${i+1}. ${apt.client_name} - ${format(new Date(apt.start_time), 'yyyy-MM-dd HH:mm')} (${apt.status}) ${apt.is_recurring_instance ? '[RECURRING]' : '[REGULAR]'}`);
    });
  } else {
    console.log('❌ NO APPOINTMENTS TO DISPLAY');
  }
  console.log('====================================');

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
