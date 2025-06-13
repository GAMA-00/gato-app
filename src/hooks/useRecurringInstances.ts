
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
  const finalEndDate = endDate || addWeeks(startDate, 26); // Extendido a 26 semanas (6 meses)

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
      
      // Debug detallado por instancia
      if (data && data.length > 0) {
        data.forEach(instance => {
          const rule = instance.recurring_rules as any;
          console.log(`Instance ${instance.id}: ${instance.instance_date} ${format(new Date(instance.start_time), 'HH:mm')} - Client: ${rule?.client_name}`);
        });
      }
      
      return data || [];
    },
    enabled: !!startDate,
    staleTime: 5000, // Reducido para debug
    refetchInterval: 15000 // Más frecuente para debug
  });
};

// Hook mejorado para generar instancias automáticamente con máxima agresividad
export const useAutoGenerateInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      console.log('=== AUTO GENERATING INSTANCES (AGGRESSIVE) ===');
      
      // Obtener todas las reglas activas
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
      
      // Generar instancias para cada regla activa
      for (const rule of activeRules) {
        try {
          // Verificar cuántas instancias futuras ya existen
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
          
          // Generar más instancias si hay menos de 20 futuras (aumentado considerablemente)
          if (existingCount < 20) {
            console.log(`Generating more instances for rule ${rule.id}...`);
            
            const { data: generatedCount, error: generateError } = await supabase.rpc(
              'generate_recurring_appointment_instances',
              {
                p_rule_id: rule.id,
                p_weeks_ahead: 30 // Aumentado a 30 semanas
              }
            );

            if (generateError) {
              console.error(`Error generating instances for rule ${rule.id}:`, generateError);
              continue;
            }

            const count = generatedCount || 0;
            totalGenerated += count;
            
            console.log(`✅ Generated ${count} new instances for rule ${rule.id} (${rule.client_name})`);
          } else {
            console.log(`✅ Rule ${rule.id} (${rule.client_name}) has enough future instances (${existingCount})`);
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
      // Invalidar todas las queries relacionadas múltiples veces
      const queries = [
        ['recurring-instances'],
        ['calendar-appointments'],
        ['appointments'],
        ['provider-availability']
      ];
      
      queries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      // Invalidar de nuevo después de un delay para asegurar actualización
      setTimeout(() => {
        queries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 2000);
    }
  });
};

// Hook para generar instancias específicas cuando se necesiten
export const useGenerateRecurringInstances = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId, weeksAhead = 30 }: { ruleId: string; weeksAhead?: number }) => {
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
