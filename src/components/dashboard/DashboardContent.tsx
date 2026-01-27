import React from 'react';
import { Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AppointmentList from '@/components/dashboard/AppointmentList';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGroupedPendingRequests } from '@/hooks/useGroupedPendingRequests';
import ProviderDashboardHeader from './ProviderDashboardHeader';
import ProviderStatsCards from './ProviderStatsCards';
import ProviderDashboardTabs from './ProviderDashboardTabs';

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
  const { data: groupedRequests = [], isLoading: isLoadingRequests } = useGroupedPendingRequests();

  const renderContent = () => {
    if (user?.role === 'provider') {
      return (
        <div className="space-y-6">
          {/* Header with logo and greeting */}
          <ProviderDashboardHeader userName={user?.name || 'Proveedor'} />

          {/* Stats cards */}
          <ProviderStatsCards stats={stats} isLoading={isLoadingStats} />

          {/* Tabs with Citas and Solicitudes */}
          <ProviderDashboardTabs
            activeAppointmentsToday={activeAppointmentsToday}
            tomorrowsAppointments={tomorrowsAppointments}
            pendingRequests={groupedRequests}
            isLoadingRequests={isLoadingRequests}
          />
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

  // For providers, use proper centering and desktop layout
  if (user?.role === 'provider') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#FAFAFA]">
          <div className={`${isMobile ? 'pt-20 px-4 pb-4' : 'md:ml-52 p-4 md:p-6'}`}>
            <div className="max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </div>
        </div>
      </>
    );
  }

  // For clients and others, keep the original PageContainer approach
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
