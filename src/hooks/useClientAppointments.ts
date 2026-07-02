import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

export interface ClientAppointment {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rejected' | 'completed';
  start_time: string;
  end_time: string;
  notes: string | null;
  listing_id: string;
  provider_id: string;
  listing_title: string;
  provider_name: string;
  provider_avatar: string | null;
  recurrence: string;
  updated_at: string | null;
}

export const useClientAppointments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-appointments-direct', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    queryFn: async (): Promise<ClientAppointment[]> => {
      if (!user?.id) return [];

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch pending/confirmed future appointments + recently rejected (24h)
      const { data, error } = await db
        .from('appointments')
        .select(`
          id,
          status,
          start_time,
          end_time,
          notes,
          listing_id,
          provider_id,
          recurrence,
          updated_at,
          listings ( id, title ),
          users!appointments_provider_id_fkey ( id, name, avatar_url )
        `)
        .eq('client_id', user.id)
        .or(
          `and(status.in.(pending,confirmed),start_time.gte.${new Date().toISOString()}),` +
          `and(status.eq.rejected,updated_at.gte.${twentyFourHoursAgo})`
        )
        .order('start_time', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        notes: row.notes,
        listing_id: row.listing_id,
        provider_id: row.provider_id,
        listing_title: row.listings?.title ?? 'Servicio',
        provider_name: row.users?.name ?? 'Proveedor',
        provider_avatar: row.users?.avatar_url ?? null,
        recurrence: row.recurrence ?? 'none',
        updated_at: row.updated_at ?? null,
      }));
    },
  });
};
