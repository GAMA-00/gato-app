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

      const now = new Date();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Step 1: fetch appointments + listing title
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
          listings ( id, title )
        `)
        .eq('client_id', user.id)
        .in('status', ['pending', 'confirmed', 'rejected'])
        .order('start_time', { ascending: true });

      if (error) throw error;

      const filtered = (data || []).filter((row: any) => {
        if (row.status === 'rejected') {
          const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
          return updatedAt ? updatedAt > twentyFourHoursAgo : false;
        }
        return new Date(row.start_time) >= now;
      });

      // Step 2: fetch provider names separately to avoid FK ambiguity (client_id + provider_id both → users)
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
        notes: row.notes,
        listing_id: row.listing_id,
        provider_id: row.provider_id,
        listing_title: row.listings?.title ?? 'Servicio',
        provider_name: providerMap.get(row.provider_id)?.name ?? 'Proveedor',
        provider_avatar: providerMap.get(row.provider_id)?.avatar_url ?? null,
        recurrence: row.recurrence ?? 'none',
        updated_at: row.updated_at ?? null,
      }));
    },
  });
};
