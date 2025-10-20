import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Invoice {
  id: string;
  invoice_number: string;
  appointment_id: string;
  client_id: string;
  provider_id: string;
  listing_id: string;
  base_price: number;
  custom_variables_total: number;
  total_price: number;
  status: 'draft' | 'pending_payment' | 'paid' | 'completed' | 'cancelled';
  onvopay_payment_id?: string;
  post_payment_invoice_id?: string;
  invoice_date: string;
  due_date?: string;
  paid_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointments?: {
    id: string;
    start_time: string;
    end_time: string;
    client_name?: string;
    provider_name?: string;
    listings?: {
      title: string;
    };
  };
}

export const useClientInvoices = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-invoices', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            end_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq('client_id', user.id)
        .order('invoice_date', { ascending: false });

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching client invoices:', error);
        throw error;
      }

      return (data || []) as Invoice[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useProviderInvoices = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['provider-invoices', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            end_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq('provider_id', user.id)
        .order('invoice_date', { ascending: false });

      // Apply status filter if provided
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching provider invoices:', error);
        throw error;
      }

      return (data || []) as Invoice[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
};

// Hook unificado para obtener todas las facturas pagadas (prepago + postpago)
export const useUnifiedPaidInvoices = (userId?: string, role?: 'client' | 'provider') => {
  const { user } = useAuth();
  const effectiveUserId = userId || user?.id;
  const effectiveRole = role || user?.role;

  return useQuery({
    queryKey: ['unified-paid-invoices', effectiveUserId, effectiveRole],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const userIdField = effectiveRole === 'client' ? 'client_id' : 'provider_id';

      // Fetch prepaid invoices (from invoices table)
      const { data: prepaidInvoices, error: prepaidError } = await supabase
        .from('invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq(userIdField, effectiveUserId)
        .in('status', ['paid', 'completed'])
        .order('paid_at', { ascending: false, nullsFirst: false });

      if (prepaidError) {
        console.error('Error fetching prepaid invoices:', prepaidError);
        throw prepaidError;
      }

      // Fetch postpaid approved invoices
      const { data: postpaidInvoices, error: postpaidError } = await supabase
        .from('post_payment_invoices')
        .select(`
          *,
          appointments!inner(
            id,
            start_time,
            client_name,
            provider_name,
            listings!inner(
              title
            )
          )
        `)
        .eq(userIdField, effectiveUserId)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false, nullsFirst: false });

      if (postpaidError) {
        console.error('Error fetching postpaid invoices:', postpaidError);
        throw postpaidError;
      }

      // Unify both invoice types
      const unifiedInvoices = [
        ...(prepaidInvoices || []).map(inv => ({
          id: inv.id,
          type: 'prepaid' as const,
          invoice_number: inv.invoice_number,
          service_title: inv.appointments?.listings?.title || 'Servicio',
          client_name: inv.appointments?.client_name || 'Cliente',
          provider_name: inv.appointments?.provider_name || 'Proveedor',
          amount: inv.total_price,
          payment_date: inv.paid_at || inv.invoice_date,
          payment_method_id: inv.onvopay_payment_id,
          status: inv.status
        })),
        ...(postpaidInvoices || []).map(inv => ({
          id: inv.id,
          type: 'postpaid' as const,
          invoice_number: `PP-${inv.id.slice(0, 8).toUpperCase()}`,
          service_title: inv.appointments?.listings?.title || 'Servicio',
          client_name: inv.appointments?.client_name || 'Cliente',
          provider_name: inv.appointments?.provider_name || 'Proveedor',
          amount: inv.total_price,
          payment_date: inv.approved_at || inv.created_at,
          payment_method_id: null,
          status: 'approved'
        }))
      ];

      // Sort by payment date descending
      unifiedInvoices.sort((a, b) => 
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
      );

      return unifiedInvoices;
    },
    enabled: !!effectiveUserId,
    refetchInterval: 30000,
  });
};
