
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useDashboardAppointments } from '@/hooks/useDashboardAppointments';
import DashboardLoadingState from '@/components/dashboard/DashboardLoadingState';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { logger } from '@/utils/logger';

const Dashboard = () => {
  const {
    user,
    isLoadingAppointments,
    appointmentsError,
    stats,
    isLoadingStats,
    statsError,
  } = useDashboardAppointments();

  // Proveedor sin catálogo → mandarlo al onboarding (primera vez)
  const navigate = useNavigate();
  React.useEffect(() => {
    if (user?.role !== 'provider' || !user?.id) return;
    (supabase as any)
      .from('listings').select('id').eq('provider_id', user.id).maybeSingle()
      .then(({ data }: any) => { if (!data) navigate('/onboarding', { replace: true }); });
  }, [user?.id, user?.role, navigate]);

  logger.debug('Dashboard render', { 
    userId: user?.id, 
    role: user?.role,
    appointmentsLoading: isLoadingAppointments,
    statsLoading: isLoadingStats
  });

  // Enhanced loading state with timeout protection
  if (isLoadingAppointments) {
    return <DashboardLoadingState />;
  }

  // Error state with retry option
  if (appointmentsError) {
    return (
      <DashboardErrorState 
        error={appointmentsError}
        stats={stats}
        statsError={statsError}
        isLoadingStats={isLoadingStats}
      />
    );
  }

  // v1: pagos ocultos — sin gates de post-pago
  return (
    <DashboardContent
      user={user}
      stats={stats}
      isLoadingStats={isLoadingStats}
      statsError={statsError}
    />
  );
};

export default Dashboard;
