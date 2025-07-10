import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook to manage recurring appointment instances
 * Generates and manages recurring instances in the database
 */
export const useRecurringInstancesManager = (providerId?: string) => {
  const queryClient = useQueryClient();

  // Mutation to generate instances for all rules
  const generateInstancesMutation = useMutation({
    mutationFn: async (weeks_ahead: number = 12) => {
      if (!providerId) throw new Error('Provider ID required');

      console.log('🚀 Generating recurring instances...');
      
      // Get all active rules for this provider
      const { data: rules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('id')
        .eq('provider_id', providerId)
        .eq('is_active', true);

      if (rulesError) throw rulesError;

      if (!rules || rules.length === 0) {
        console.log('ℹ️ No active rules found');
        return { generated: 0, rules_processed: 0 };
      }

      console.log(`📋 Processing ${rules.length} rules...`);

      let totalGenerated = 0;
      
      // Generate instances for each rule
      for (const rule of rules) {
        const { data: result, error } = await supabase.rpc('generate_recurring_appointment_instances', {
          p_rule_id: rule.id,
          p_weeks_ahead: weeks_ahead
        });

        if (error) {
          console.error(`❌ Error generating instances for rule ${rule.id}:`, error);
        } else {
          totalGenerated += result || 0;
          console.log(`✅ Generated ${result || 0} instances for rule ${rule.id}`);
        }
      }

      console.log(`🎉 Total instances generated: ${totalGenerated}`);
      return { generated: totalGenerated, rules_processed: rules.length };
    },
    onSuccess: (result) => {
      toast.success(`Generadas ${result.generated} citas recurrentes para ${result.rules_processed} reglas`);
      
      // Invalidate calendar queries to refresh the view
      queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] });
      queryClient.invalidateQueries({ queryKey: ['rules-needing-instances'] });
    },
    onError: (error) => {
      console.error('Error generating instances:', error);
      toast.error('Error al generar citas recurrentes');
    },
  });

  // Mutation to extend instances (add more future instances)
  const extendInstancesMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Extending recurring instances...');
      
      const { data: result, error } = await supabase.rpc('extend_recurring_instances');

      if (error) throw error;

      console.log(`✅ Extended ${result || 0} instances`);
      return result || 0;
    },
    onSuccess: (result) => {
      toast.success(`Extendidas ${result} citas recurrentes`);
      queryClient.invalidateQueries({ queryKey: ['calendar-recurring-system'] });
    },
    onError: (error) => {
      console.error('Error extending instances:', error);
      toast.error('Error al extender citas recurrentes');
    },
  });

  return {
    generateInstances: generateInstancesMutation.mutate,
    extendInstances: extendInstancesMutation.mutate,
    isGenerating: generateInstancesMutation.isPending,
    isExtending: extendInstancesMutation.isPending,
  };
};