
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, isAfter, startOfDay } from 'date-fns';

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
  const finalEndDate = endDate || addWeeks(startDate, 16);

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
            )
          )
        `)
        .gte('instance_date', format(startDate, 'yyyy-MM-dd'))
        .lte('instance_date', format(finalEndDate, 'yyyy-MM-dd'))
        .in('status', ['scheduled', 'confirmed', 'completed']);

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
    staleTime: 30000,
    refetchInterval: 60000
  });
};

// Hook para generar instancias automáticamente para todas las reglas activas
export const useAutoGenerateInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('Running automatic instance generation...');
      
      // Obtener todas las reglas activas
      const { data: activeRules, error } = await supabase
        .from('recurring_rules')
        .select('id, recurrence_type, provider_id, start_date')
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

      let totalGenerated = 0;
      
      for (const rule of activeRules) {
        try {
          // Verificar si necesita generar más instancias
          const { data: existingInstances, error: countError } = await supabase
            .from('recurring_appointment_instances')
            .select('instance_date')
            .eq('recurring_rule_id', rule.id)
            .gte('instance_date', format(new Date(), 'yyyy-MM-dd'))
            .order('instance_date', { ascending: false })
            .limit(1);

          if (countError) {
            console.error(`Error checking instances for rule ${rule.id}:`, countError);
            continue;
          }

          // Si no hay instancias futuras o la última es muy cercana, generar más
          const needsGeneration = !existingInstances || 
            existingInstances.length === 0 || 
            !isAfter(new Date(existingInstances[0].instance_date), addWeeks(new Date(), 3));

          if (needsGeneration) {
            console.log(`Generating instances for rule ${rule.id}`);
            
            const { data: generatedCount, error: generateError } = await supabase.rpc(
              'generate_recurring_appointment_instances',
              {
                p_rule_id: rule.id,
                p_weeks_ahead: 12
              }
            );

            if (generateError) {
              console.error(`Error generating instances for rule ${rule.id}:`, generateError);
              continue;
            }

            const count = generatedCount || 0;
            totalGenerated += count;
            
            if (count > 0) {
              console.log(`Generated ${count} instances for rule ${rule.id}`);
            }
          } else {
            console.log(`Rule ${rule.id} already has sufficient future instances`);
          }
        } catch (error) {
          console.error(`Exception generating instances for rule ${rule.id}:`, error);
        }
      }

      console.log(`Total instances generated: ${totalGenerated}`);
      return totalGenerated;
    },
    onSuccess: (generatedCount) => {
      if (generatedCount > 0) {
        // Invalidar queries para refrescar los datos
        queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        console.log(`Successfully generated ${generatedCount} instances and refreshed queries`);
      }
    }
  });
};

// Hook para generar instancias específicas cuando se necesiten
export const useGenerateRecurringInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, weeksAhead = 12 }: { ruleId: string; weeksAhead?: number }) => {
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
      queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    }
  });
};
