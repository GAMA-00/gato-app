
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

// Hook para ejecutar el mantenimiento automáticamente en intervalos
export const useRecurringMaintenance = () => {
  React.useEffect(() => {
    // Ejecutar al montar el componente
    maintainRecurringInstances();
    
    // Ejecutar cada 10 minutos
    const interval = setInterval(() => {
      maintainRecurringInstances();
    }, 10 * 60 * 1000); // 10 minutos
    
    return () => clearInterval(interval);
  }, []);
};
