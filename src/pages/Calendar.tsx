
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import CalendarView from '@/components/calendar/CalendarView';
import JobRequestsGrouped from '@/components/calendar/JobRequestsGrouped';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const Calendar = () => {
  const { user } = useAuth();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['calendar-appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const now = new Date();
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`)
        .gte('end_time', now.toISOString()) // Only future appointments
        .not('status', 'in', '(cancelled,rejected)') // Exclude cancelled and rejected
        .order('start_time', { ascending: true });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="md:ml-52">
          <PageContainer 
            title="Calendario" 
            subtitle="Cargando citas..."
            className="pt-0"
          >
            <div className="w-full space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </PageContainer>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <div className="w-full min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-app-text mb-2">
                Calendario
              </h1>
            </div>
            
            {/* Content */}
            <div className="space-y-6">
              {/* Show job requests for providers */}
              {user?.role === 'provider' && (
                <div className="w-full">
                  <JobRequestsGrouped />
                </div>
              )}
              
              {/* Calendar view */}
              <div className="w-full">
                <CalendarView appointments={appointments} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Calendar;
