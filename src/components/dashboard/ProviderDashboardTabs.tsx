import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import AppointmentList from './AppointmentList';
import ProviderStatsCards from './ProviderStatsCards';
import RequestCard from '@/components/calendar/RequestCard';
import { useRequestActions } from '@/hooks/useRequestActions';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStats as DashboardStatsType } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProviderDashboardTabsProps {
  activeAppointmentsToday: any[];
  tomorrowsAppointments: any[];
  pendingRequests: any[];
  isLoadingRequests?: boolean;
  stats?: DashboardStatsType;
  isLoadingStats?: boolean;
}

const ProviderDashboardTabs: React.FC<ProviderDashboardTabsProps> = ({
  activeAppointmentsToday,
  tomorrowsAppointments,
  pendingRequests,
  isLoadingRequests = false,
  stats,
  isLoadingStats
}) => {
  const { handleAccept, handleDecline, isLoading: isProcessing } = useRequestActions();
  const isMobile = useIsMobile();

  const citasCount = activeAppointmentsToday.length + tomorrowsAppointments.length;
  const solicitudesCount = pendingRequests.length;

  const onAccept = (request: any) => {
    handleAccept(request);
  };

  const onDecline = (request: any) => {
    handleDecline(request);
  };

  // Use more height on mobile (accounting for navbar ~64px + header ~80px + tabs ~60px + bottom nav ~80px)
  const scrollHeight = isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 380px)';

  return (
    <Tabs defaultValue="citas" className="w-full flex-1 flex flex-col">
      <TabsList className="w-full bg-muted/60 p-1 rounded-full h-auto flex-shrink-0">
        <TabsTrigger 
          value="citas" 
          className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 gap-2"
        >
          Citas
          {citasCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full bg-background/80 text-foreground"
            >
              {citasCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger 
          value="solicitudes" 
          className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 gap-2"
        >
          Solicitudes
          {solicitudesCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full bg-background/80 text-foreground"
            >
              {solicitudesCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent 
        value="citas" 
        className="mt-4 overflow-y-auto focus-visible:outline-none flex-1"
        style={{ maxHeight: scrollHeight }}
      >
        <div className="space-y-4 pb-4">
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

          <ProviderStatsCards stats={stats} isLoading={isLoadingStats} />
        </div>
      </TabsContent>

      <TabsContent 
        value="solicitudes" 
        className="mt-4 overflow-y-auto focus-visible:outline-none flex-1"
        style={{ maxHeight: scrollHeight }}
      >
        <div className="space-y-4 pb-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-foreground">Solicitudes de Reserva</h3>
            {solicitudesCount > 0 && (
              <Badge variant="secondary" className="rounded-full">
                {solicitudesCount}
              </Badge>
            )}
          </div>

          {isLoadingRequests ? (
            <div className="space-y-4">
              <Skeleton className="h-[180px] w-full rounded-2xl" />
              <Skeleton className="h-[180px] w-full rounded-2xl" />
            </div>
          ) : pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map((request: any) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  onAccept={onAccept}
                  onDecline={onDecline}
                  isLoading={isProcessing}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay solicitudes pendientes</p>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default ProviderDashboardTabs;
