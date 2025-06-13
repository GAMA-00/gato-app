
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
  const finalEndDate = endDate || addWeeks(startDate, 12); // Optimizado a 12 semanas

  return useQuery({
    queryKey: ['recurring-instances', providerId, format(startDate, 'yyyy-MM-dd'), format(finalEndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      console.log('=== FETCHING RECURRING INSTANCES ===');
      console.log('Date range:', {
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
    staleTime: 60000, // 1 minuto
    refetchInterval: false // No auto-refetch para evitar bucles
  });
};

// Hook optimizado para generar instancias automáticamente
export const useAutoGenerateInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('=== AUTO GENERATING INSTANCES ===');
      
      const { data: activeRules, error } = await supabase
        .from('recurring_rules')
        .select('id, recurrence_type, provider_id, start_date, client_name, is_active')
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
          const today = new Date().toISOString().split('T')[0];
          const { data: futureInstances, error: countError } = await supabase
            .from('recurring_appointment_instances')
            .select('id, instance_date', { count: 'exact' })
            .eq('recurring_rule_id', rule.id)
            .gte('instance_date', today)
            .order('instance_date', { ascending: true });

          if (countError) {
            console.error(`Error counting instances for rule ${rule.id}:`, countError);
            continue;
          }

          const existingCount = futureInstances?.length || 0;
          console.log(`Rule ${rule.id} (${rule.client_name}) has ${existingCount} future instances`);
          
          // Generar más instancias si hay menos de 8 futuras (optimizado)
          if (existingCount < 8) {
            console.log(`Generating more instances for rule ${rule.id}...`);
            
            const { data: generatedCount, error: generateError } = await supabase.rpc(
              'generate_recurring_appointment_instances',
              {
                p_rule_id: rule.id,
                p_weeks_ahead: 15 // Optimizado
              }
            );

            if (generateError) {
              console.error(`Error generating instances for rule ${rule.id}:`, generateError);
              continue;
            }

            const count = generatedCount || 0;
            totalGenerated += count;
            
            console.log(`✅ Generated ${count} new instances for rule ${rule.id} (${rule.client_name})`);
          }
        } catch (error) {
          console.error(`Exception generating instances for rule ${rule.id}:`, error);
        }
      }

      console.log(`=== TOTAL GENERATED: ${totalGenerated} ===`);
      return totalGenerated;
    },
    onSuccess: (generatedCount) => {
      console.log(`Successfully generated ${generatedCount} instances`);
      // Invalidar queries de forma controlada
      queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    }
  });
};

// Hook para generar instancias específicas
export const useGenerateRecurringInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, weeksAhead = 15 }: { ruleId: string; weeksAhead?: number }) => {
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
    onSuccess: (generatedCount, variables) => {
      console.log(`Successfully generated ${generatedCount} instances for rule ${variables.ruleId}`);
      queryClient.invalidateQueries({ queryKey: ['recurring-instances'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    }
  });
};
