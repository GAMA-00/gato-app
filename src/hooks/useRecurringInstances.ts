
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
        .from('recurring_instances')
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
    const { data, error } = await supabase.rpc('generate_recurring_instances', {
      rule_id: ruleId,
      start_range: format(startRange, 'yyyy-MM-dd'),
      end_range: format(endRange, 'yyyy-MM-dd')
    });

    if (error) {
      console.error('Error generating recurring instances:', error);
      throw error;
    }

    return data;
  };

  return { generateInstances };
};
