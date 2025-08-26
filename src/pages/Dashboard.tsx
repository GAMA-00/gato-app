
import React from 'react';
import { useDashboardAppointments } from '@/hooks/useDashboardAppointments';
import DashboardLoadingState from '@/components/dashboard/DashboardLoadingState';
import DashboardErrorState from '@/components/dashboard/DashboardErrorState';
import DashboardContent from '@/components/dashboard/DashboardContent';
import PostPaymentGate from '@/components/dashboard/PostPaymentGate';
import ClientPostPaymentGate from '@/components/client/PostPaymentGate';

const Dashboard = () => {
  const {
    user,
    isLoadingAppointments,
    appointmentsError,
    stats,
    isLoadingStats,
    statsError,
    activeAppointmentsToday,
    tomorrowsAppointments
  } = useDashboardAppointments();

  console.log("=== DASHBOARD RENDER ===");
  console.log("Dashboard - User:", user?.id, user?.role);
  console.log("Dashboard - Appointments loading:", isLoadingAppointments);
  console.log("Dashboard - Stats loading:", isLoadingStats);

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

  // Main content rendering with post-payment gating
  return (
    <PostPaymentGate>
      <ClientPostPaymentGate>
        <DashboardContent 
          user={user}
          activeAppointmentsToday={activeAppointmentsToday}
          tomorrowsAppointments={tomorrowsAppointments}
          stats={stats}
          isLoadingStats={isLoadingStats}
          statsError={statsError}
        />
      </ClientPostPaymentGate>
    </PostPaymentGate>
  );
};

export default Dashboard;
