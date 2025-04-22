import React, { useState, useEffect } from 'react';
import { Calendar, Eye, EyeOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import QuickStats from '@/components/dashboard/QuickStats';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { getDashboardStats } from '@/lib/data';
import { isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { Appointment, DashboardStats as DashboardStatsType } from '@/lib/types';

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
  const [stats, setStats] = useState<DashboardStatsType>(getDashboardStats());
  
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

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      <div className="space-y-6">
        <QuickStats />
        
        <DashboardStats stats={stats} />

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
      </div>
    </PageContainer>
  );
};

export default Dashboard;
