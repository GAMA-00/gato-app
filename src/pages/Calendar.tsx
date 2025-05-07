
import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequests from '@/components/calendar/JobRequests';
import BlockedTimeSlots from '@/components/calendar/BlockedTimeSlots';
import { toast } from "@/components/ui/use-toast";
import { useAppointments } from '@/hooks/useAppointments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Calendar = () => {
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const { data: appointments = [] } = useAppointments();
  const [showBlockedTimeSlots, setShowBlockedTimeSlots] = useState(false);
  
  // Filter appointments based on status filters
  const filteredAppointments = appointments.filter((appointment: any) => {
    if (statusFilter.length === 0) return true;
    if (!showCompleted && appointment.status === 'completed') return false;
    return statusFilter.includes(appointment.status);
  });

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
        {showBlockedTimeSlots && (
          <BlockedTimeSlots />
        )}
        <CalendarView appointments={filteredAppointments} />
      </div>
    </PageContainer>
  );
};

export default Calendar;
