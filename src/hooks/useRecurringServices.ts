
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useRecurringServices() {
  const [count, setCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchRecurringServices = async () => {
      if (!user) {
        setCount(0);
        return;
      }

      try {
        console.log('Fetching recurring services for user:', user.id);
        
        // Consultar reglas de recurrencia activas del usuario actual
        const { data: recurringRules, error } = await supabase
          .from('recurring_rules')
          .select('id, recurrence_type, is_active')
          .eq('client_id', user.id)
          .eq('is_active', true)
          .in('recurrence_type', ['weekly', 'biweekly', 'monthly']); // Solo servicios recurrentes

        if (error) {
          console.error('Error fetching recurring rules:', error);
          setCount(0);
          return;
        }

        // Contar las reglas de recurrencia activas
        const recurringCount = recurringRules?.length || 0;
        console.log('User has', recurringCount, 'active recurring services');
        console.log('Recurring rules found:', recurringRules);
        
        setCount(recurringCount);
      } catch (err) {
        console.error('Error parsing recurring services:', err);
        setCount(0);
      }
    };

    fetchRecurringServices();
  }, [user]);

  return { count };
}
