
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Función para extender automáticamente las instancias recurrentes
export const maintainRecurringInstances = async () => {
  try {
    console.log('Running recurring instances maintenance...');
    
    const { data, error } = await supabase.rpc('extend_recurring_instances');
    
    if (error) {
      console.error('Error maintaining recurring instances:', error);
      return 0;
    }
    
    if (data && data > 0) {
      console.log(`Extended ${data} recurring instances`);
    }
    
    return data || 0;
  } catch (error) {
    console.error('Error in maintainRecurringInstances:', error);
    return 0;
  }
};

// Función mejorada para generar instancias faltantes
export const generateMissingInstances = async () => {
  try {
    console.log('Generating missing recurring instances...');
    
    // Obtener todas las reglas activas
    const { data: activeRules, error: rulesError } = await supabase
      .from('recurring_rules')
      .select('id, recurrence_type, provider_id, start_date')
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching active rules:', rulesError);
      return 0;
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
          .gte('instance_date', new Date().toISOString().split('T')[0])
          .order('instance_date', { ascending: false });

        if (countError) {
          console.error(`Error counting instances for rule ${rule.id}:`, countError);
          continue;
        }

        const existingCount = futureInstances?.length || 0;
        
        // Si hay menos de 5 instancias futuras, generar más
        if (existingCount < 5) {
          console.log(`Rule ${rule.id} has only ${existingCount} future instances, generating more...`);
          
          const { data: generated, error: generateError } = await supabase.rpc(
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

          const count = generated || 0;
          totalGenerated += count;
          
          if (count > 0) {
            console.log(`Generated ${count} instances for rule ${rule.id} (provider: ${rule.provider_id})`);
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
    
  } catch (error) {
    console.error('Error in generateMissingInstances:', error);
    return 0;
  }
};

// Hook mejorado para ejecutar el mantenimiento automáticamente
export const useRecurringMaintenance = () => {
  useEffect(() => {
    // Ejecutar al montar el componente
    generateMissingInstances();
    
    // Ejecutar cada 3 minutos para generar instancias faltantes
    const generateInterval = setInterval(() => {
      generateMissingInstances();
    }, 3 * 60 * 1000); // 3 minutos
    
    // Ejecutar cada 10 minutos para extender instancias existentes
    const maintainInterval = setInterval(() => {
      maintainRecurringInstances();
    }, 10 * 60 * 1000); // 10 minutos
    
    return () => {
      clearInterval(generateInterval);
      clearInterval(maintainInterval);
    };
  }, []);
};
