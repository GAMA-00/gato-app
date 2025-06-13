
import { useEffect } from 'react';
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

// Función ultra-agresiva para generar instancias faltantes
export const generateMissingInstances = async () => {
  try {
    console.log('=== GENERATING MISSING INSTANCES (ULTRA-AGGRESSIVE) ===');
    
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

    console.log(`Found ${activeRules.length} active recurring rules:`, 
      activeRules.map(r => ({ id: r.id, client: r.client_name, type: r.recurrence_type, active: r.is_active }))
    );

    let totalGenerated = 0;
    
    // Generar instancias para cada regla activa con máxima agresividad
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
        
        // Generar más si hay menos de 25 instancias futuras (muy aumentado)
        if (existingCount < 25) {
          console.log(`🚀 Generating instances for rule ${rule.id}...`);
          
          const { data: generated, error: generateError } = await supabase.rpc(
            'generate_recurring_appointment_instances',
            {
              p_rule_id: rule.id,
              p_weeks_ahead: 35 // Aumentado a 35 semanas (8+ meses)
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
          } else {
            console.log(`ℹ️ No new instances needed for rule ${rule.id} (${rule.client_name})`);
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

// Hook para ejecutar el mantenimiento automáticamente con máxima frecuencia para debug
export const useRecurringMaintenance = () => {
  useEffect(() => {
    console.log('=== INITIALIZING ULTRA-AGGRESSIVE RECURRING MAINTENANCE ===');
    
    // Ejecutar inmediatamente al montar el componente
    generateMissingInstances();
    
    // Ejecutar cada 5 segundos para debug (ultra-agresivo)
    const generateInterval = setInterval(() => {
      console.log('=== ULTRA-PERIODIC MAINTENANCE ===');
      generateMissingInstances();
    }, 5 * 1000); // 5 segundos para debug
    
    // Ejecutar extensión cada 30 segundos
    const maintainInterval = setInterval(() => {
      console.log('=== ULTRA-PERIODIC EXTENSION ===');
      maintainRecurringInstances();
    }, 30 * 1000); // 30 segundos
    
    return () => {
      clearInterval(generateInterval);
      clearInterval(maintainInterval);
    };
  }, []);
};
