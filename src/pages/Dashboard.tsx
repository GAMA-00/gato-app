import React, { useState } from 'react';
import { Calendar, Eye, EyeOff } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import AppointmentList from '@/components/dashboard/AppointmentList';
import RatingSection from '@/components/dashboard/RatingSection';
import QuickStats from '@/components/dashboard/QuickStats';
import { MOCK_APPOINTMENTS, getDashboardStats } from '@/lib/data';
import { isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const mockComments = [
  { 
    id: 'r1', 
    clientName: 'María López', 
    serviceName: 'Limpieza Estándar',
    date: new Date(2023, 5, 28), 
    rating: 5, 
    comment: 'Excelente servicio, mi casa quedó impecable.' 
  },
  { 
    id: 'r2', 
    clientName: 'Juan García', 
    serviceName: 'Limpieza Profunda',
    date: new Date(2023, 5, 26), 
    rating: 4, 
    comment: 'Buen servicio, aunque llegaron un poco tarde.' 
  },
  { 
    id: 'r3', 
    clientName: 'Ana Torres', 
    serviceName: 'Mantenimiento',
    date: new Date(2023, 5, 25), 
    rating: 5, 
    comment: 'Muy profesionales y puntuales.' 
  }
];

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
  const stats = getDashboardStats();
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  
  const todaysAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, today))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
  const tomorrowsAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, tomorrow))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

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
          <QuickStats />
        </StatisticsSection>
        
        <StatisticsSection title="Estadísticas de Desempeño">
          <DashboardStats stats={stats} />
        </StatisticsSection>
        
        <StatisticsSection title="Calificaciones y Comentarios" defaultOpen={false}>
          <RatingSection comments={mockComments} />
        </StatisticsSection>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
