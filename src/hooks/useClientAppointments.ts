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
  last_modified_at: string | null;
}

export const useClientAppointments = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['client-appointments-direct', user?.id],
    enabled: !!user?.id,
    staleTime: 0,
    queryFn: async (): Promise<ClientAppointment[]> => {
      if (!user?.id) return [];

      const now = new Date();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Step 1: appointments + listing title (no FK join on users to avoid ambiguity)
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
          last_modified_at,
          listings ( id, title )
        `)
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed', 'rejected'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((row: any) => {
        if (row.status === 'rejected') {
          const modifiedAt = row.last_modified_at ? new Date(row.last_modified_at) : null;
          return modifiedAt ? modifiedAt > twentyFourHoursAgo : false;
        }
        // pending/confirmed: only future or ongoing
        return new Date(row.start_time) >= now;
      });

      if (filtered.length === 0) return [];

      // Step 2: fetch provider names separately (both client_id and provider_id → users causes ambiguity)
      const providerIds = [...new Set(filtered.map((r: any) => r.provider_id).filter(Boolean))];
      const providerMap = new Map<string, { name: string; avatar_url: string | null }>();
      if (providerIds.length > 0) {
        const { data: providers } = await db
          .from('users')
          .select('id, name, avatar_url')
          .in('id', providerIds);
        (providers || []).forEach((p: any) => providerMap.set(p.id, p));
      }

      return filtered.map((row: any) => ({
        id: row.id,
        status: row.status,
        start_time: row.start_time,
        end_time: row.end_time,
        notes: row.notes ?? null,
        listing_id: row.listing_id,
        provider_id: row.provider_id,
        listing_title: row.listings?.title ?? 'Servicio',
        provider_name: providerMap.get(row.provider_id)?.name ?? 'Proveedor',
        provider_avatar: providerMap.get(row.provider_id)?.avatar_url ?? null,
        recurrence: row.recurrence ?? 'none',
        last_modified_at: row.last_modified_at ?? null,
      }));
    },
  });
};
