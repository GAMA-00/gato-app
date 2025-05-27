
import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequests from '@/components/calendar/JobRequests';
import BlockedTimeSlots from '@/components/calendar/BlockedTimeSlots';
import { useCalendarAppointments } from '@/hooks/useCalendarAppointments';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

const Calendar = () => {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const { data: appointments = [], isLoading } = useCalendarAppointments(currentCalendarDate);
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect clients away from provider pages
  React.useEffect(() => {
    if (user && user.role === 'client') {
      navigate('/client');
    }
  }, [user, navigate]);
  
  // Filter appointments based on status filters - exclude cancelled appointments by default
  const filteredAppointments = appointments.filter((appointment: any) => {
    // Always exclude cancelled and rejected appointments from the calendar view
    if (appointment.status === 'cancelled' || appointment.status === 'rejected') return false;
    
    if (statusFilter.length === 0) return true;
    if (!showCompleted && appointment.status === 'completed') return false;
    return statusFilter.includes(appointment.status);
  });

  // Log the appointments to debug
  React.useEffect(() => {
    console.log("Calendar appointments for date:", currentCalendarDate.toISOString());
    console.log("All appointments:", appointments);
    console.log("Pending appointments:", appointments.filter((app: any) => app.status === 'pending'));
    console.log("Recurring appointments:", appointments.filter((app: any) => app.is_recurring));
  }, [appointments, currentCalendarDate]);

  // If user is not a provider, don't render this page
  if (user && user.role !== 'provider') {
    return null;
  }

  return (
    <PageContainer 
      title="Calendario" 
      subtitle="Administra tu agenda y citas"
      action={
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('pending')}
                onCheckedChange={() => {
                  setStatusFilter(prev => 
                    prev.includes('pending') 
                      ? prev.filter(s => s !== 'pending') 
                      : [...prev, 'pending']
                  );
                }}
              >
                Pendiente
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter.includes('confirmed')}
                onCheckedChange={() => {
                  setStatusFilter(prev => 
                    prev.includes('confirmed') 
                      ? prev.filter(s => s !== 'confirmed') 
                      : [...prev, 'confirmed']
                  );
                }}
              >
                Confirmada
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              >
                Mostrar Completadas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={() => setShowBlockedTimeSlots(!showBlockedTimeSlots)}>
            {showBlockedTimeSlots ? 'Ocultar Horarios Bloqueados' : 'Gestionar Disponibilidad'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Always render JobRequests for providers */}
        <JobRequests />
        
        {showBlockedTimeSlots && (
          <BlockedTimeSlots />
        )}
        
        <CalendarView 
          appointments={filteredAppointments} 
          currentDate={currentCalendarDate}
          onDateChange={setCurrentCalendarDate}
        />
      </div>
    </PageContainer>
  );
};

export default Calendar;
