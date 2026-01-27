import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MonthlyCalendarGridProps {
  currentDate: Date;
  selectedDate: Date;
  appointments: any[];
  onSelectDate: (date: Date) => void;
  onNavigate: (date: Date) => void;
}

const MonthlyCalendarGrid: React.FC<MonthlyCalendarGridProps> = ({
  currentDate,
  selectedDate,
  appointments,
  onSelectDate,
  onNavigate
}) => {
  // Get all days to display (including days from prev/next month to fill the grid)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

  // Get appointments count by status for a specific day
  const getAppointmentIndicators = (date: Date) => {
    const dayAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time);
      return isSameDay(aptDate, date);
    });

    const confirmed = dayAppointments.filter(apt => apt.status === 'confirmed').length;
    const pending = dayAppointments.filter(apt => apt.status === 'pending').length;

    return { confirmed, pending, total: dayAppointments.length };
  };

  const handlePrevMonth = () => {
    onNavigate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    onNavigate(addMonths(currentDate, 1));
  };

  return (
    <div className="bg-gray-900 rounded-t-3xl p-4 pb-8">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white text-xl font-semibold capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePrevMonth}
            className="text-white hover:bg-gray-800 h-8 w-8"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextMonth}
            className="text-white hover:bg-gray-800 h-8 w-8"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className="text-center text-gray-400 text-sm font-medium py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const indicators = getAppointmentIndicators(day);

          return (
            <button
              key={index}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 rounded-full transition-all",
                "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-gray-900",
                isCurrentMonth ? "text-white" : "text-gray-600",
                isSelected && "bg-orange-500 text-white",
                !isSelected && isTodayDate && "ring-2 ring-orange-500",
                !isSelected && isCurrentMonth && "hover:bg-gray-800"
              )}
            >
              <span className={cn(
                "text-sm font-medium",
                isSelected && "font-bold"
              )}>
                {format(day, 'd')}
              </span>
              
              {/* Appointment Indicators */}
              {indicators.total > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {indicators.confirmed > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  {indicators.pending > 0 && (
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyCalendarGrid;
