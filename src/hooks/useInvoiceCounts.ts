import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Hook para contar facturas pendientes por generar (proveedores)
export const usePendingInvoicesCount = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['pending-invoices-count', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'provider') {
        return 0;
      }

      const { count, error } = await supabase
        .from('post_payment_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .in('status', ['draft', 'rejected']);

      if (error) {
        console.error('Error fetching pending invoices count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id && user.role === 'provider',
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Hook para contar facturas pendientes de aprobación (clientes)
export const useClientInvoicesCount = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['client-invoices-count', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'client') {
        return 0;
      }

      const { count, error } = await supabase
        .from('post_payment_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id)
        .eq('status', 'submitted');

      if (error) {
        console.error('Error fetching client invoices count:', error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id && user.role === 'client',
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};