
import React, { useEffect, useMemo } from 'react';
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
  
  const today = useMemo(() => startOfToday(), []);
  const tomorrow = useMemo(() => startOfTomorrow(), []);
  
  console.log("Dashboard - User:", user);
  console.log("Dashboard - Appointments:", appointments?.length || 0);
  
  // Memoize filtered appointments to avoid recalculating on every render
  const { todaysAppointments, tomorrowsAppointments, activeAppointmentsToday } = useMemo(() => {
    if (!appointments?.length) {
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }

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
  }, [appointments, today, tomorrow]);

  // Optimized auto-update with reduced frequency and better conditions
  useEffect(() => {
    if (!user || !appointments?.length) return;

    const updateAppointmentStatuses = async () => {
      const now = new Date();
      const appointmentsToUpdate = appointments.filter(
        app => app.status === 'confirmed' && new Date(app.end_time) < now
      );

      if (appointmentsToUpdate.length > 0) {
        console.log("Updating status for completed appointments:", appointmentsToUpdate.length);
        
        // Batch update for better performance
        const updatePromises = appointmentsToUpdate.map(app =>
          supabase
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', app.id)
        );
        
        try {
          await Promise.all(updatePromises);
          // Only invalidate if updates were successful
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
        } catch (error) {
          console.error("Error updating appointment statuses:", error);
        }
      }
    };
    
    // Immediate update
    updateAppointmentStatuses();
    
    // Set up interval with longer period to reduce load
    const interval = setInterval(updateAppointmentStatuses, 300000); // Every 5 minutes instead of 1
    
    return () => clearInterval(interval);
  }, [user?.id, appointments?.length, queryClient]); // More specific dependencies

  console.log("Dashboard filtered appointments:");
  console.log("- Today's active:", activeAppointmentsToday?.length || 0);
  console.log("- Tomorrow's:", tomorrowsAppointments?.length || 0);

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

  // Memoized content to avoid unnecessary re-renders
  const dashboardContent = useMemo(() => {
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
  }, [user?.role, activeAppointmentsToday, tomorrowsAppointments, stats, appointmentsError]);

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      {dashboardContent}
    </PageContainer>
  );
};

export default Dashboard;
