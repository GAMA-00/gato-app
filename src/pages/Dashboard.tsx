
import React, { useState, useEffect } from 'react';
import { Calendar, Eye, EyeOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import QuickStats from '@/components/dashboard/QuickStats';
import { isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { Appointment } from '@/lib/types';

const StatisticsSection = ({ 
  title, 
  defaultOpen = true, 
  children 
}: { 
  title: string, 
  defaultOpen?: boolean,
  children: React.ReactNode 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? 
              <EyeOff className="h-4 w-4" /> : 
              <Eye className="h-4 w-4" />
            }
            <span className="sr-only">
              {isOpen ? 'Ocultar' : 'Mostrar'} {title}
            </span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Load appointments from localStorage
  useEffect(() => {
    const savedAppointments = localStorage.getItem('gato_appointments');
    if (savedAppointments) {
      try {
        const parsedAppointments = JSON.parse(savedAppointments, (key, value) => {
          if (key === 'startTime' || key === 'endTime' || key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        setAppointments(parsedAppointments);
      } catch (error) {
        console.error('Error parsing appointments:', error);
      }
    }
  }, []);
  
  // Filter appointments for the current provider
  const providerAppointments = user 
    ? appointments.filter(appointment => appointment.providerId === user.id)
    : [];
  
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  
  const todaysAppointments = providerAppointments
    .filter(app => isSameDay(app.startTime, today))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
  const tomorrowsAppointments = providerAppointments
    .filter(app => isSameDay(app.startTime, tomorrow))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  // Calculate quick stats
  const upcomingAppointments = providerAppointments.filter(app => app.startTime > today).length;
  const totalAppointments = providerAppointments.length;

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      <div className="space-y-6">
        <AppointmentList
          appointments={todaysAppointments}
          title="Citas de Hoy"
          icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
          emptyMessage="No hay citas programadas para hoy"
        />

        <AppointmentList
          appointments={tomorrowsAppointments}
          title="Citas de Mañana"
          icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
          emptyMessage="No hay citas programadas para mañana"
        />
        
        <StatisticsSection title="Estadísticas Rápidas" defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Citas Hoy</h3>
              <p className="text-2xl font-bold">{todaysAppointments.length}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Citas Mañana</h3>
              <p className="text-2xl font-bold">{tomorrowsAppointments.length}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Próximas Citas</h3>
              <p className="text-2xl font-bold">{upcomingAppointments}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-muted-foreground">Total Citas</h3>
              <p className="text-2xl font-bold">{totalAppointments}</p>
            </div>
          </div>
        </StatisticsSection>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
