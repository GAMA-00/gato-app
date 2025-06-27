import React from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppointmentList from '@/components/dashboard/AppointmentList';
import DashboardStats from '@/components/dashboard/DashboardStats';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardContentProps {
  user: any;
  activeAppointmentsToday: any[];
  tomorrowsAppointments: any[];
  stats?: any;
  isLoadingStats?: boolean;
  statsError?: any;
}

const DashboardContent: React.FC<DashboardContentProps> = ({
  user,
  activeAppointmentsToday,
  tomorrowsAppointments,
  stats,
  isLoadingStats,
  statsError
}) => {
  const isMobile = useIsMobile();

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
        <PageContainer 
          title=""
          className={isMobile ? "pt-0" : "pt-0"}
        >
          {renderContent()}
        </PageContainer>
      </>
    );
  }

  // For clients and others, keep the original title and subtitle
  return (
    <>
      <Navbar />
      <PageContainer 
        title="Inicio" 
        subtitle="Bienvenido de nuevo"
        className="pt-0"
      >
        {renderContent()}
      </PageContainer>
    </>
  );
};

export default DashboardContent;
