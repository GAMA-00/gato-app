
import React, { useState } from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequests from '@/components/calendar/JobRequests';
import BlockedTimeSlots from '@/components/calendar/BlockedTimeSlots';
import { MOCK_APPOINTMENTS } from '@/lib/data';
import { toast } from "@/components/ui/use-toast";
import { Appointment } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Calendar = () => {
  // For a real app, you would implement state for filters and appointments
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  
  const handleAddAppointment = () => {
    // In a real app, this would open a form to create a new appointment
    console.log('Agregar cita');
  };

  const handleAcceptRequest = (request: any) => {
    // In a real app, you would call an API to accept the request
    const newAppointment = {
      ...request.appointment,
      status: 'confirmed'
    };
    
    setAppointments(prev => [...prev, newAppointment]);
    
    toast({
      title: "Job request accepted",
      description: "The appointment has been added to your calendar.",
    });
  };

  const handleDeclineRequest = (requestId: string) => {
    // In a real app, you would call an API to decline the request
    toast({
      title: "Job request declined",
      description: "The request has been removed from your list.",
    });
  };

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
                checked={statusFilter.includes('scheduled')}
                onCheckedChange={() => {
                  setStatusFilter(prev => 
                    prev.includes('scheduled') 
                      ? prev.filter(s => s !== 'scheduled') 
                      : [...prev, 'scheduled']
                  );
                }}
              >
                Programada
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
          
          <Button onClick={handleAddAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {showBlockedTimeSlots && (
          <BlockedTimeSlots />
        )}
        <JobRequests 
          onAcceptRequest={handleAcceptRequest}
          onDeclineRequest={handleDeclineRequest}
        />
        <CalendarView appointments={appointments} />
      </div>
    </PageContainer>
  );
};

export default Calendar;
