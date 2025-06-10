
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
      console.log('Fetching recurring instances for date range:', {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(finalEndDate, 'yyyy-MM-dd'),
        providerId
      });

      let query = supabase
        .from('recurring_appointment_instances')
        .select(`
          *,
          recurring_rules!inner(
            *,
            listings(
              title,
              duration
            ),
            users!recurring_rules_client_id_fkey(
              name,
              phone,
              email
            )
          )
        `)
        .gte('instance_date', format(startDate, 'yyyy-MM-dd'))
        .lte('instance_date', format(finalEndDate, 'yyyy-MM-dd'))
        .eq('status', 'scheduled'); // Solo instancias programadas

      if (providerId) {
        query = query.eq('recurring_rules.provider_id', providerId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recurring instances:', error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} recurring instances`);
      return data || [];
    },
    enabled: !!startDate,
    staleTime: 60000, // 1 minute
    refetchInterval: 120000 // 2 minutes
  });
};

// Hook para generar instancias dinámicamente cuando se necesiten
export const useGenerateRecurringInstances = () => {
  const queryClient = useQueryClient();

  const generateInstancesMutation = useMutation({
    mutationFn: async ({ ruleId, weeksAhead = 10 }: { ruleId: string; weeksAhead?: number }) => {
      console.log(`Generating instances for rule ${ruleId}, weeks ahead: ${weeksAhead}`);
      
      const { data, error } = await supabase.rpc('generate_recurring_appointment_instances', {
        p_rule_id: ruleId,
        p_weeks_ahead: weeksAhead
      });

      if (error) {
        console.error('Error generating recurring instances:', error);
        throw error;
      }

      console.log(`Generated ${data || 0} new instances for rule ${ruleId}`);
      return data || 0;
    },
    onSuccess: () => {
      // Invalidar queries relacionadas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    }
  });

  const generateInstances = async (ruleId: string, startRange: Date, endRange: Date) => {
    const weeksAhead = Math.ceil((endRange.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24 * 7));
    return generateInstancesMutation.mutateAsync({ ruleId, weeksAhead });
  };

  return { generateInstances, isGenerating: generateInstancesMutation.isPending };
};

// Hook para verificar y generar instancias automáticamente
export const useAutoGenerateInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('Running automatic instance generation...');
      
      // Obtener todas las reglas activas
      const { data: activeRules, error } = await supabase
        .from('recurring_rules')
        .select('id, recurrence_type')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching active rules:', error);
        throw error;
      }

      if (!activeRules || activeRules.length === 0) {
        console.log('No active recurring rules found');
        return 0;
      }

      console.log(`Found ${activeRules.length} active recurring rules`);

      // Generar instancias para cada regla
      let totalGenerated = 0;
      for (const rule of activeRules) {
        try {
          const { data: generatedCount, error: generateError } = await supabase.rpc(
            'generate_recurring_appointment_instances',
            {
              p_rule_id: rule.id,
              p_weeks_ahead: 10
            }
          );

          if (generateError) {
            console.error(`Error generating instances for rule ${rule.id}:`, generateError);
            continue;
          }

          totalGenerated += generatedCount || 0;
          console.log(`Generated ${generatedCount || 0} instances for rule ${rule.id}`);
        } catch (error) {
          console.error(`Failed to generate instances for rule ${rule.id}:`, error);
        }
      }

      console.log(`Total instances generated: ${totalGenerated}`);
      return totalGenerated;
    },
    onSuccess: (generatedCount) => {
      if (generatedCount > 0) {
        // Invalidar todas las queries relacionadas
        queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        console.log(`Successfully generated ${generatedCount} instances and refreshed queries`);
      }
    }
  });
};
