
import React from 'react';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import { MOCK_APPOINTMENTS } from '@/lib/data';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Calendar = () => {
  // For a real app, you would implement state for filters
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [showCompleted, setShowCompleted] = React.useState(true);
  
  const handleAddAppointment = () => {
    // In a real app, this would open a form to create a new appointment
    console.log('Agregar cita');
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
          
          <Button onClick={handleAddAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <CalendarView appointments={MOCK_APPOINTMENTS} />
      </div>
    </PageContainer>
  );
};

export default Calendar;
