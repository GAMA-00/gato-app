
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RecurringServicesSummary {
  totalRecurringServices: number;
  totalActiveInstances: number;
  weeklyServices: number;
  biweeklyServices: number;
  monthlyServices: number;
}

export function useRecurringServices() {
  const [summary, setSummary] = useState<RecurringServicesSummary>({
    totalRecurringServices: 0,
    totalActiveInstances: 0,
    weeklyServices: 0,
    biweeklyServices: 0,
    monthlyServices: 0,
  });
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecurringServices = async () => {
      if (!user) {
        setSummary({
          totalRecurringServices: 0,
          totalActiveInstances: 0,
          weeklyServices: 0,
          biweeklyServices: 0,
          monthlyServices: 0,
        });
        return;
      }

      try {
        console.log('🔄 Fetching recurring services summary for user:', user.id);
        
        // Obtener todas las citas del cliente con información de recurrencia
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select(`
            id,
            recurrence,
            status,
            listing_id,
            recurrence_group_id,
            is_recurring_instance
          `)
          .eq('client_id', user.id)
          .in('status', ['pending', 'confirmed'])
          .in('recurrence', ['weekly', 'biweekly', 'monthly']);

        if (error) {
          console.error('❌ Error fetching recurring appointments:', error);
          return;
        }

        if (!appointments?.length) {
          console.log('📭 No recurring appointments found');
          return;
        }

        console.log(`📊 Found ${appointments.length} recurring appointments`);

        // Agrupar por recurrence_group_id para contar servicios únicos
        const groupedByRecurrence = appointments.reduce((acc, apt) => {
          const groupKey = apt.recurrence_group_id || apt.listing_id;
          if (!acc[groupKey]) {
            acc[groupKey] = {
              recurrence: apt.recurrence,
              instances: []
            };
          }
          acc[groupKey].instances.push(apt);
          return acc;
        }, {} as Record<string, { recurrence: string; instances: any[] }>);

        // Calcular estadísticas
        const uniqueServices = Object.keys(groupedByRecurrence);
        const totalRecurringServices = uniqueServices.length;
        const totalActiveInstances = appointments.length;
        
        const weeklyServices = uniqueServices.filter(
          key => groupedByRecurrence[key].recurrence === 'weekly'
        ).length;
        
        const biweeklyServices = uniqueServices.filter(
          key => groupedByRecurrence[key].recurrence === 'biweekly'
        ).length;
        
        const monthlyServices = uniqueServices.filter(
          key => groupedByRecurrence[key].recurrence === 'monthly'
        ).length;

        const newSummary = {
          totalRecurringServices,
          totalActiveInstances,
          weeklyServices,
          biweeklyServices,
          monthlyServices,
        };

        console.log('📈 Recurring services summary:', newSummary);
        setSummary(newSummary);

      } catch (err) {
        console.error('❌ Error processing recurring services:', err);
        setSummary({
          totalRecurringServices: 0,
          totalActiveInstances: 0,
          weeklyServices: 0,
          biweeklyServices: 0,
          monthlyServices: 0,
        });
      }
    };

    fetchRecurringServices();
  }, [user]);

  return { 
    count: summary.totalRecurringServices, // Backward compatibility
    summary 
  };
}
