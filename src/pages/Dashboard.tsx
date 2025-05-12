
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import QuickStats from '@/components/dashboard/QuickStats';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, endOfTomorrow, startOfDay, endOfDay, addDays, isSameDay } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: appointments = [], isLoading: isLoadingAppointments } = useAppointments();
  const { data: stats, isLoading: isLoadingStats } = useStats();
  
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const tomorrowEnd = endOfTomorrow();
  
  // Filter appointments by day
  const todaysAppointments = appointments
    .filter(app => {
      const appDate = new Date(app.start_time);
      return isSameDay(appDate, today) && app.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    
  const tomorrowsAppointments = appointments
    .filter(app => {
      const appDate = new Date(app.start_time);
      return isSameDay(appDate, tomorrow) && app.status !== 'cancelled';
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Filter pending appointments for providers
  const pendingAppointments = user?.role === 'provider' ? appointments
    .filter(app => app.status === 'pending')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()) : [];

  if (isLoadingAppointments || isLoadingStats) {
    return (
      <PageContainer title="Inicio" subtitle="Bienvenido de nuevo">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </PageContainer>
    );
  }

  // Only show the right content based on user role
  const renderDashboardContent = () => {
    // For providers, show pending requests and stats
    if (user?.role === 'provider') {
      return (
        <div className="space-y-6">
          {pendingAppointments.length > 0 && (
            <AppointmentList
              appointments={pendingAppointments}
              title="Solicitudes Pendientes"
              icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
              emptyMessage="No hay solicitudes pendientes"
              isPending={true}
            />
          )}

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

          {stats && <DashboardStats stats={stats} />}
        </div>
      );
    }
    
    // For clients, only show their appointments (no stats)
    else if (user?.role === 'client') {
      return (
        <div className="space-y-6">
          <AppointmentList
            appointments={todaysAppointments}
            title="Mis Citas de Hoy"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para hoy"
          />

          <AppointmentList
            appointments={tomorrowsAppointments}
            title="Mis Citas de Mañana"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para mañana"
          />
        </div>
      );
    }
    
    // If no role or unknown role, show empty state
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No hay información disponible</p>
        </div>
      </div>
    );
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      {renderDashboardContent()}
    </PageContainer>
  );
};

export default Dashboard;
