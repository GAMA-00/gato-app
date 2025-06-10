
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
  const finalEndDate = endDate || addWeeks(startDate, 20); // Extendido a 20 semanas

  return useQuery({
    queryKey: ['recurring-instances', providerId, format(startDate, 'yyyy-MM-dd'), format(finalEndDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      console.log('Fetching recurring instances for extended date range:', {
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

      console.log(`Found ${data?.length || 0} recurring instances in extended range`);
      return data || [];
    },
    enabled: !!startDate,
    staleTime: 30000,
    refetchInterval: 60000
  });
};

// Hook mejorado para generar instancias automáticamente
export const useAutoGenerateInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('Running enhanced automatic instance generation...');
      
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
      
      // Generar instancias para cada regla activa
      for (const rule of activeRules) {
        try {
          // Verificar cuántas instancias futuras ya existen
          const { data: futureInstances, error: countError } = await supabase
            .from('recurring_appointment_instances')
            .select('id', { count: 'exact' })
            .eq('recurring_rule_id', rule.id)
            .gte('instance_date', format(new Date(), 'yyyy-MM-dd'))
            .order('instance_date', { ascending: false });

          if (countError) {
            console.error(`Error counting instances for rule ${rule.id}:`, countError);
            continue;
          }

          const existingCount = futureInstances?.length || 0;
          
          // Si hay menos de 10 instancias futuras, generar más (aumentado de 5 a 10)
          if (existingCount < 10) {
            console.log(`Rule ${rule.id} has only ${existingCount} future instances, generating more...`);
            
            const { data: generatedCount, error: generateError } = await supabase.rpc(
              'generate_recurring_appointment_instances',
              {
                p_rule_id: rule.id,
                p_weeks_ahead: 20 // Aumentado de 12 a 20 semanas
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
            console.log(`Rule ${rule.id} already has ${existingCount} future instances, skipping...`);
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
        queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
        console.log(`Successfully generated ${generatedCount} instances and refreshed queries`);
      }
    }
  });
};

// Hook para generar instancias específicas cuando se necesiten
export const useGenerateRecurringInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, weeksAhead = 20 }: { ruleId: string; weeksAhead?: number }) => {
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
      queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    }
  });
};
