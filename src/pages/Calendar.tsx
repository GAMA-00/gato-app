
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import Navbar from '@/components/layout/Navbar';

const Calendar = () => {
  return (
    <>
      <Navbar />
      <PageContainer 
        title="Calendario" 
        subtitle="Gestiona tus citas y horarios"
        className="pt-0"
      >
        <CalendarView />
      </PageContainer>
    </>
  );
};

export default Calendar;
