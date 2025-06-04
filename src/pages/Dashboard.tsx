
import React, { useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import QuickStats from '@/components/dashboard/QuickStats';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, endOfTomorrow, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: stats, isLoading: isLoadingStats } = useStats();
  const queryClient = useQueryClient();
  
  const today = startOfToday();
  const tomorrow = startOfTomorrow();
  const tomorrowEnd = endOfTomorrow();
  
  console.log("Dashboard - User:", user);
  console.log("Dashboard - Appointments:", appointments);
  console.log("Dashboard - Loading:", isLoadingAppointments);
  console.log("Dashboard - Error:", appointmentsError);
  
  // Auto-update appointment statuses
  useEffect(() => {
    const updateAppointmentStatuses = async () => {
      if (!user || !appointments.length) return;

      const now = new Date();
      const appointmentsToUpdate = appointments.filter(
        app => app.status === 'confirmed' && new Date(app.end_time) < now
      );

      if (appointmentsToUpdate.length > 0) {
        console.log("Updating status for completed appointments:", appointmentsToUpdate.length);
        
        // Update appointments to completed status
        for (const app of appointmentsToUpdate) {
          await supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', app.id);
        }
        
        // Refresh appointments data
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
      }
    };
    
    updateAppointmentStatuses();
    
    // Set up an interval to check for completed appointments
    const interval = setInterval(updateAppointmentStatuses, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [user, appointments, queryClient]);
  
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

  // Further filter out completed appointments from today's list
  const activeAppointmentsToday = todaysAppointments.filter(app => 
    app.status !== 'completed' && new Date(app.end_time) > new Date()
  );

  console.log("Dashboard filtered appointments:");
  console.log("- Today's active:", activeAppointmentsToday);
  console.log("- Tomorrow's:", tomorrowsAppointments);

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

  if (appointmentsError) {
    console.error("Dashboard appointments error:", appointmentsError);
  }

  // Only show the right content based on user role
  const renderDashboardContent = () => {
    // For providers, show pending requests and stats
    if (user?.role === 'provider') {
      return (
        <div className="space-y-6">
          <AppointmentList
            appointments={activeAppointmentsToday}
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
            appointments={activeAppointmentsToday}
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
          {appointmentsError && (
            <p className="text-red-500 text-sm mt-2">
              Error cargando citas: {appointmentsError.message}
            </p>
          )}
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
