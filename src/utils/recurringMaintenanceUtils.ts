
import React from 'react';
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

// Función para generar instancias faltantes para todas las reglas activas
export const generateMissingInstances = async () => {
  try {
    console.log('Generating missing recurring instances...');
    
    // Obtener todas las reglas activas
    const { data: activeRules, error: rulesError } = await supabase
      .from('recurring_rules')
      .select('id, recurrence_type, provider_id')
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
        const { data: generated, error: generateError } = await supabase.rpc(
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

        const count = generated || 0;
        totalGenerated += count;
        
        if (count > 0) {
          console.log(`Generated ${count} instances for rule ${rule.id} (provider: ${rule.provider_id})`);
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

// Hook para ejecutar el mantenimiento automáticamente en intervalos
export const useRecurringMaintenance = () => {
  React.useEffect(() => {
    // Ejecutar al montar el componente
    generateMissingInstances();
    
    // Ejecutar cada 5 minutos para generar instancias faltantes
    const generateInterval = setInterval(() => {
      generateMissingInstances();
    }, 5 * 60 * 1000); // 5 minutos
    
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
