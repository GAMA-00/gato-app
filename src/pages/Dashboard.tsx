
import React, { useEffect, useMemo } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useStats();
  const queryClient = useQueryClient();
  
  const today = useMemo(() => startOfToday(), []);
  const tomorrow = useMemo(() => startOfTomorrow(), []);
  
  console.log("Dashboard - User:", user);
  console.log("Dashboard - Appointments:", appointments?.length || 0);
  console.log("Dashboard - Appointments Error:", appointmentsError);
  console.log("Dashboard - Stats Error:", statsError);
  
  // Memoize filtered appointments to avoid recalculating on every render
  const { todaysAppointments, tomorrowsAppointments, activeAppointmentsToday } = useMemo(() => {
    if (!appointments?.length) {
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }

    try {
      const todaysAppts = appointments
        .filter(app => {
          const appDate = new Date(app.start_time);
          return isSameDay(appDate, today) && app.status !== 'cancelled';
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        
      const tomorrowsAppts = appointments
        .filter(app => {
          const appDate = new Date(app.start_time);
          return isSameDay(appDate, tomorrow) && app.status !== 'cancelled';
        })
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Filter out completed appointments from today's list
      const activeToday = todaysAppts.filter(app => 
        app.status !== 'completed' && new Date(app.end_time) > new Date()
      );

      return {
        todaysAppointments: todaysAppts,
        tomorrowsAppointments: tomorrowsAppts,
        activeAppointmentsToday: activeToday
      };
    } catch (error) {
      console.error("Error filtering appointments:", error);
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }
  }, [appointments, today, tomorrow]);

  // Auto-update appointment statuses
  useEffect(() => {
    if (!user || !appointments?.length) return;

    const updateAppointmentStatuses = async () => {
      try {
        const now = new Date();
        const appointmentsToUpdate = appointments.filter(
          app => app.status === 'confirmed' && new Date(app.end_time) < now
        );

        if (appointmentsToUpdate.length > 0) {
          console.log("Updating status for completed appointments:", appointmentsToUpdate.length);
          
          const updatePromises = appointmentsToUpdate.map(app =>
            supabase
              .from('appointments')
              .update({ status: 'completed' })
              .eq('id', app.id)
          );
          
          await Promise.all(updatePromises);
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        }
      } catch (error) {
        console.error("Error updating appointment statuses:", error);
      }
    };
    
    const interval = setInterval(updateAppointmentStatuses, 300000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [user?.id, appointments?.length, queryClient]);

  // Show loading state with better UX
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

  // Show error state with more detailed information
  if (appointmentsError) {
    console.error("Dashboard appointments error:", appointmentsError);
    return (
      <PageContainer title="Inicio" subtitle="Bienvenido de nuevo">
        <Alert className="mb-6">
          <AlertDescription className="space-y-2">
            <div>Hubo un problema cargando las citas. Por favor, recarga la página.</div>
            <details className="text-xs mt-2">
              <summary className="cursor-pointer font-medium">Detalles del error</summary>
              <div className="mt-1 text-muted-foreground">
                {appointmentsError.message || 'Error desconocido'}
              </div>
            </details>
          </AlertDescription>
        </Alert>
        
        {/* Show stats if available, even if appointments failed */}
        {stats && !statsError && <DashboardStats stats={stats} />}
      </PageContainer>
    );
  }

  // Show warning for stats error but continue with appointments
  const hasStatsError = statsError && !isLoadingStats;

  // Render content based on user role
  const renderContent = () => {
    if (user?.role === 'provider') {
      return (
        <div className="space-y-6">
          {hasStatsError && (
            <Alert className="mb-4">
              <AlertDescription>
                No se pudieron cargar las estadísticas, pero las citas están disponibles.
              </AlertDescription>
            </Alert>
          )}

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
    
    if (user?.role === 'client') {
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
    
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            No hay información disponible para mostrar.
          </AlertDescription>
        </Alert>
      </div>
    );
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      {renderContent()}
    </PageContainer>
  );
};

export default Dashboard;
