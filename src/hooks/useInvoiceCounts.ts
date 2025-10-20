import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

// Hook para contar facturas postpago que necesitan acción del proveedor
export const usePendingInvoicesCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['pending-invoices-count', user?.id],
    queryFn: async () => {
      if (!user?.id || user.role !== 'provider') {
        return 0;
      }

      // Solo contar draft y rejected (submitted está esperando al cliente)
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
    refetchInterval: 5000, // Reducido a 5s como fallback
  });

  // Suscripción en tiempo real para actualizaciones instantáneas
  useEffect(() => {
    if (!user?.id || user.role !== 'provider') return;

    const channel = supabase
      .channel('provider-invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'post_payment_invoices',
          filter: `provider_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Invoice change detected for provider:', payload);
          // Invalidar query para refresco inmediato
          queryClient.invalidateQueries({ queryKey: ['pending-invoices-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, queryClient]);

  return query;
};

// Hook para contar facturas pendientes de aprobación (clientes)
export const useClientInvoicesCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const query = useQuery({
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
    refetchInterval: 5000, // Reducido a 5s como fallback
  });

  // Suscripción en tiempo real para actualizaciones instantáneas
  useEffect(() => {
    if (!user?.id || user.role !== 'client') return;

    const channel = supabase
      .channel('client-invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'post_payment_invoices',
          filter: `client_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📊 Invoice change detected for client:', payload);
          // Invalidar query para refresco inmediato
          queryClient.invalidateQueries({ queryKey: ['client-invoices-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, queryClient]);

  return query;
};