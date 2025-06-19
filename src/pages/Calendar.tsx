
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
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .or(`provider_id.eq.${user.id},client_id.eq.${user.id}`)
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
            <Skeleton className="h-96 w-full rounded-lg" />
          </PageContainer>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer 
          title="Calendario" 
          subtitle="Gestiona tus citas y horarios"
          className="pt-0"
        >
          <div className="space-y-6">
            {/* Show job requests for providers */}
            {user?.role === 'provider' && <JobRequestsGrouped />}
            
            {/* Calendar view */}
            <CalendarView appointments={appointments} />
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default Calendar;
