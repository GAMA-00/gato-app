
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
        // Consultar citas recurrentes activas del usuario actual
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('id, recurrence, status')
          .eq('client_id', user.id)
          .neq('recurrence', 'none') // Excluir servicios únicos
          .in('status', ['pending', 'confirmed']); // Solo citas activas

        if (error) {
          console.error('Error fetching recurring appointments:', error);
          setCount(0);
          return;
        }

        // Contar las citas recurrentes únicas
        const recurringCount = appointments?.length || 0;
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
