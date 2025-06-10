
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks } from 'date-fns';

interface UseRecurringInstancesProps {
  providerId?: string;
  startDate: Date;
  endDate?: Date;
}

export const useRecurringInstances = ({ 
  providerId, 
  startDate, 
  endDate 
}: UseRecurringInstancesProps) => {
  const finalEndDate = endDate || addWeeks(startDate, 16); // Default to 16 weeks if no end date

  return useQuery({
    queryKey: ['recurring-instances', providerId, format(startDate, 'yyyy-MM-dd'), format(finalEndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      let query = supabase
        .from('recurring_appointment_instances')
        .select(`
          *,
          recurring_rules!inner(
            *
          )
        `)
        .gte('instance_date', format(startDate, 'yyyy-MM-dd'))
        .lte('instance_date', format(finalEndDate, 'yyyy-MM-dd'));

      if (providerId) {
        query = query.eq('recurring_rules.provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recurring instances:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!startDate
  });
};

// Hook para generar instancias dinámicamente cuando se necesiten
export const useGenerateRecurringInstances = () => {
  const generateInstances = async (ruleId: string, startRange: Date, endRange: Date) => {
    const { data, error } = await supabase.rpc('generate_recurring_appointment_instances', {
      p_rule_id: ruleId,
      p_weeks_ahead: Math.ceil((endRange.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24 * 7))
    });

    if (error) {
      console.error('Error generating recurring instances:', error);
      throw error;
    }

    return data;
  };

  return { generateInstances };
};
