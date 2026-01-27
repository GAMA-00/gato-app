import React, { useState } from 'react';
import MonthlyCalendarGrid from './MonthlyCalendarGrid';
import DayAppointmentsList from './DayAppointmentsList';

interface CalendarViewProps {
  appointments: any[];
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  currentDate: propCurrentDate,
  onDateChange
}) => {
  const [internalCurrentDate, setInternalCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Use prop currentDate if provided, otherwise use internal state
  const currentDate = propCurrentDate || internalCurrentDate;
  
  const handleDateChange = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalCurrentDate(newDate);
    }
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="overflow-hidden rounded-3xl shadow-medium">
      {/* Dark themed monthly calendar grid */}
      <MonthlyCalendarGrid 
        currentDate={currentDate}
        selectedDate={selectedDate}
        appointments={appointments}
        onSelectDate={handleSelectDate}
        onNavigate={handleDateChange}
      />
      
      {/* Light themed day appointments list */}
      <DayAppointmentsList 
        selectedDate={selectedDate}
        appointments={appointments}
      />
    </div>
  );
};

export default CalendarView;
