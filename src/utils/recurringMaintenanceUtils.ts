
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

// Función para extender automáticamente las instancias recurrentes
export const maintainRecurringInstances = async () => {
  try {
    console.log('=== MAINTAINING RECURRING INSTANCES ===');
    
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

// Función optimizada para generar instancias faltantes
export const generateMissingInstances = async () => {
  try {
    console.log('=== GENERATING MISSING INSTANCES ===');
    
    // Obtener todas las reglas activas
    const { data: activeRules, error: rulesError } = await supabase
      .from('recurring_rules')
      .select('id, recurrence_type, provider_id, start_date, client_name, is_active')
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
    
    // Generar instancias para cada regla activa de forma más eficiente
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
        
        console.log(`Rule ${rule.id} (${rule.client_name}): ${existingCount} future instances`);
        
        // Generar más si hay menos de 10 instancias futuras (reducido para ser más eficiente)
        if (existingCount < 10) {
          console.log(`Generating instances for rule ${rule.id}...`);
          
          const { data: generated, error: generateError } = await supabase.rpc(
            'generate_recurring_appointment_instances',
            {
              p_rule_id: rule.id,
              p_weeks_ahead: 15 // Reducido a 15 semanas para mejor rendimiento
            }
          );

          if (generateError) {
            console.error(`Error generating instances for rule ${rule.id}:`, generateError);
            continue;
          }

          const count = generated || 0;
          totalGenerated += count;
          
          if (count > 0) {
            console.log(`✅ Generated ${count} instances for rule ${rule.id} (${rule.client_name})`);
          }
        } else {
          console.log(`✅ Rule ${rule.id} (${rule.client_name}) has enough instances (${existingCount})`);
        }
      } catch (error) {
        console.error(`Exception generating instances for rule ${rule.id}:`, error);
      }
    }

    console.log(`=== GENERATION COMPLETE: ${totalGenerated} total instances ===`);
    return totalGenerated;
    
  } catch (error) {
    console.error('Error in generateMissingInstances:', error);
    return 0;
  }
};

// Hook optimizado para ejecutar el mantenimiento de forma controlada
export const useRecurringMaintenance = () => {
  React.useEffect(() => {
    console.log('=== INITIALIZING RECURRING MAINTENANCE ===');
    
    // Ejecutar inmediatamente al montar el componente
    generateMissingInstances();
    
    // Ejecutar cada 5 minutos (mucho más eficiente)
    const generateInterval = setInterval(() => {
      console.log('=== PERIODIC MAINTENANCE ===');
      generateMissingInstances();
    }, 5 * 60 * 1000); // 5 minutos
    
    // Ejecutar extensión cada 10 minutos
    const maintainInterval = setInterval(() => {
      console.log('=== PERIODIC EXTENSION ===');
      maintainRecurringInstances();
    }, 10 * 60 * 1000); // 10 minutos
    
    return () => {
      clearInterval(generateInterval);
      clearInterval(maintainInterval);
    };
  }, []); // Sin dependencias para evitar re-ejecuciones
};
