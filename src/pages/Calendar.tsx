
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const Calendar = () => {
  const { data: appointments = [], isLoading } = useCalendarAppointments();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer 
          title="Calendario" 
          subtitle="Cargando citas..."
          className="pt-0"
        >
          <Skeleton className="h-96 w-full rounded-lg" />
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Calendario" 
        subtitle="Gestiona tus citas y horarios"
        className="pt-0"
      >
        <CalendarView appointments={appointments} />
      </PageContainer>
    </>
  );
};

export default Calendar;
