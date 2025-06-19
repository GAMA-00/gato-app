import React, { useEffect, useMemo } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import DashboardStats from '@/components/dashboard/DashboardStats';
import Navbar from '@/components/layout/Navbar';
import { Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppointments } from '@/hooks/useAppointments';
import { useStats } from '@/hooks/useStats';
import { startOfToday, startOfTomorrow, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIsMobile } from '@/hooks/use-mobile';

const Dashboard = () => {
  const { user } = useAuth();
  const { data: appointments = [], isLoading: isLoadingAppointments, error: appointmentsError } = useAppointments();
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useStats();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const today = useMemo(() => startOfToday(), []);
  const tomorrow = useMemo(() => startOfTomorrow(), []);
  
  console.log("=== DASHBOARD RENDER ===");
  console.log("Dashboard - User:", user?.id, user?.role);
  console.log("Dashboard - Appointments loading:", isLoadingAppointments, "Count:", appointments?.length || 0);
  console.log("Dashboard - Stats loading:", isLoadingStats);
  
  // Enhanced appointment filtering with deduplication
  const { todaysAppointments, tomorrowsAppointments, activeAppointmentsToday } = useMemo(() => {
    if (!appointments?.length) {
      return {
        todaysAppointments: [],
        tomorrowsAppointments: [],
        activeAppointmentsToday: []
      };
    }

    try {
      const now = new Date();
      
      console.log("=== FILTERING APPOINTMENTS ===");
      console.log(`Processing ${appointments.length} total appointments`);
      
      // Create a Map to deduplicate appointments by time slot
      const appointmentsByTimeSlot = new Map();
      
      // Process appointments and deduplicate
      appointments.forEach(app => {
        if (app.status === 'cancelled' || app.status === 'rejected') return;
        
        const appDate = new Date(app.start_time);
        const timeSlotKey = `${appDate.toISOString()}-${app.provider_id}`;
        
        // Check if we already have an appointment for this time slot
        if (appointmentsByTimeSlot.has(timeSlotKey)) {
          const existing = appointmentsByTimeSlot.get(timeSlotKey);
          // Prefer regular appointments over recurring instances
          if (!existing.is_recurring_instance && app.is_recurring_instance) {
            console.log(`Skipping duplicate recurring instance: ${app.client_name} at ${appDate.toLocaleString()}`);
            return;
          } else if (existing.is_recurring_instance && !app.is_recurring_instance) {
            console.log(`Replacing recurring instance with regular appointment: ${app.client_name} at ${appDate.toLocaleString()}`);
          }
        }
        
        appointmentsByTimeSlot.set(timeSlotKey, app);
      });
      
      // Convert back to array and filter by date
      const uniqueAppointments = Array.from(appointmentsByTimeSlot.values());
      const todaysAppts: any[] = [];
      const tomorrowsAppts: any[] = [];
      
      uniqueAppointments.forEach(app => {
        const appDate = new Date(app.start_time);
        
        console.log(`Processing appointment ${app.id}:`, {
          date: appDate.toLocaleDateString(),
          time: appDate.toLocaleTimeString(),
          isToday: isSameDay(appDate, today),
          isTomorrow: isSameDay(appDate, tomorrow),
          status: app.status,
          isRecurring: app.is_recurring_instance,
          clientName: app.client_name,
          serviceName: app.service_title || app.listings?.title
        });
        
        if (isSameDay(appDate, today)) {
          todaysAppts.push(app);
        } else if (isSameDay(appDate, tomorrow)) {
          tomorrowsAppts.push(app);
        }
      });

      // Sort by start time
      todaysAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      tomorrowsAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      // Filter active appointments for today (not completed and not past end time)
      const activeToday = todaysAppts.filter(app => 
        app.status !== 'completed' && new Date(app.end_time) > now
      );

      console.log("=== APPOINTMENT FILTERING RESULTS ===");
      console.log(`Total unique appointments: ${uniqueAppointments.length}`);
      console.log(`Today's appointments: ${todaysAppts.length}`);
      console.log(`Tomorrow's appointments: ${tomorrowsAppts.length}`);
      console.log(`Active today: ${activeToday.length}`);
      
      // Log details of tomorrow's appointments for debugging
      if (tomorrowsAppts.length > 0) {
        console.log("Tomorrow's appointments details:");
        tomorrowsAppts.forEach((app, index) => {
          console.log(`${index + 1}. ${app.client_name} - ${new Date(app.start_time).toLocaleTimeString()} - ${app.is_recurring_instance ? 'Recurring' : 'Regular'}`);
        });
      }

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

  // Optimized auto-update for completed appointments (reduced frequency)
  useEffect(() => {
    if (!user || !appointments?.length) return;

    const updateCompletedAppointments = async () => {
      try {
        const now = new Date();
        const toUpdate = appointments.filter(
          app => app.status === 'confirmed' && 
                 new Date(app.end_time) < now &&
                 !app.is_recurring_instance // Only update regular appointments, not recurring instances
        );

        if (toUpdate.length > 0) {
          console.log("Updating status for", toUpdate.length, "completed appointments");
          
          const updatePromises = toUpdate.map(app =>
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
    
    // Reduced frequency to prevent excessive updates
    const interval = setInterval(updateCompletedAppointments, 600000); // Every 10 minutes
    
    return () => clearInterval(interval);
  }, [user?.id, appointments?.length, queryClient]);

  // Enhanced loading state with priority information
  if (isLoadingAppointments) {
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Inicio" subtitle="Cargando tu información...">
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Cargando dashboard...</p>
                  <p className="text-sm text-muted-foreground">
                    Obteniendo tus citas de hoy y mañana
                  </p>
                </div>
              </div>
            </div>
          </PageContainer>
        </div>
      </>
    );
  }

  // Error state with retry option
  if (appointmentsError) {
    console.error("Dashboard appointments error:", appointmentsError);
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Inicio" subtitle="Error al cargar">
            <Alert className="mb-6">
              <AlertDescription className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-800">Error al cargar las citas</h4>
                  <p className="text-red-600 mt-1">
                    No se pudieron cargar tus citas. Por favor, intenta nuevamente.
                  </p>
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  Recargar página
                </button>
              </AlertDescription>
            </Alert>
            
            {/* Show stats if available, even if appointments failed */}
            {stats && !statsError && !isLoadingStats && <DashboardStats stats={stats} />}
          </PageContainer>
        </div>
      </>
    );
  }

  // Main content rendering
  const renderContent = () => {
    if (user?.role === 'provider') {
      return (
        <div className="space-y-6">
          {/* Custom greeting for providers with reduced mobile spacing */}
          <div className={isMobile ? "mb-3" : "mb-6"}>
            <h1 className={`font-bold tracking-tight text-app-text ${
              isMobile ? "text-xl mb-3" : "text-2xl md:text-3xl mb-6"
            }`}>
              Bienvenido {user?.name || 'Proveedor'}
            </h1>
          </div>

          {/* Priority: Today's appointments first - includes recurring instances */}
          <AppointmentList
            appointments={activeAppointmentsToday}
            title="Citas de Hoy"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para hoy"
          />

          {/* Tomorrow's appointments - includes recurring instances */}
          <AppointmentList
            appointments={tomorrowsAppointments}
            title="Citas de Mañana"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para mañana"
          />

          {/* Stats loaded separately, don't block main content */}
          {isLoadingStats ? (
            <div className="h-32 bg-muted rounded-lg animate-pulse flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando estadísticas...</span>
              </div>
            </div>
          ) : stats && !statsError ? (
            <DashboardStats stats={stats} />
          ) : statsError ? (
            <Alert>
              <AlertDescription>
                No se pudieron cargar las estadísticas en este momento.
              </AlertDescription>
            </Alert>
          ) : null}
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
      <Alert>
        <AlertDescription>
          Bienvenido al dashboard. La información se cargará según tu tipo de usuario.
        </AlertDescription>
      </Alert>
    );
  };

  // For providers, use PageContainer without title and subtitle and reduced padding
  if (user?.role === 'provider') {
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer 
            title=""
            className={isMobile ? "pt-0" : "pt-0"}
          >
            {renderContent()}
          </PageContainer>
        </div>
      </>
    );
  }

  // For clients and others, keep the original title and subtitle
  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer 
          title="Inicio" 
          subtitle="Bienvenido de nuevo"
          className="pt-0"
        >
          {renderContent()}
        </PageContainer>
      </div>
    </>
  );
};

export default Dashboard;
