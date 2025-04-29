
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Residencia } from '@/lib/types';
import { toast } from 'sonner';

export function useResidencias() {
  const [residencias, setResidencias] = useState<Residencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchResidencias = async () => {
      try {
        setIsLoading(true);
        console.log('Consultando residencias desde Supabase');
        
        const { data, error } = await supabase
          .from('residencias')
          .select('id, name, address');
        
        if (error) {
          console.error('Error al cargar residencias:', error);
          toast.error('Error al cargar las residencias');
          setError(error);
          return;
        }
        
        console.log('Residencias cargadas:', data);
        setResidencias(data || []);
      } catch (error: any) {
        console.error('Error al cargar residencias:', error);
        toast.error('Error al cargar las residencias');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResidencias();
  }, []);

  return { residencias, isLoading, error };
}
