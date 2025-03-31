import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import AppointmentList from '@/components/dashboard/AppointmentList';
import RatingSection from '@/components/dashboard/RatingSection';
import QuickStats from '@/components/dashboard/QuickStats';
import { MOCK_APPOINTMENTS, MOCK_SERVICES, MOCK_CLIENTS, getDashboardStats } from '@/lib/data';
import { useNavigate } from 'react-router-dom';
import { isSameDay, addDays } from 'date-fns';

// Mock comments and ratings data
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

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  
  // Filter appointments for today and tomorrow
  const todaysAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, today))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
  const tomorrowsAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, tomorrow))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const handleAddAppointment = () => {
    navigate('/calendar');
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      action={
        <Button onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Today's Appointments */}
        <AppointmentList
          appointments={todaysAppointments}
          title="Citas de Hoy"
          icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
          emptyMessage="No hay citas programadas para hoy"
        />

        {/* Tomorrow's Appointments */}
        <AppointmentList
          appointments={tomorrowsAppointments}
          title="Citas de Mañana"
          icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
          emptyMessage="No hay citas programadas para mañana"
        />
        
        {/* Performance Statistics */}
        <DashboardStats stats={stats} />
        
        {/* Ratings Section */}
        <RatingSection comments={mockComments} />
        
        {/* Quick Stats */}
        <QuickStats />
      </div>
    </PageContainer>
  );
};

export default Dashboard;
