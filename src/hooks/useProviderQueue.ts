import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

// Campos que necesitan AppointmentCard + serviceDetailsFormatter
const APPOINTMENT_SELECT = `
  id, status, start_time, end_time, notes, recurrence,
  client_id, client_name, client_phone, client_email, client_address,
  client_lat, client_lng, provider_id, provider_name, listing_id,
  external_booking, final_price, custom_variable_selections,
  custom_variables_total_price, address_detail,
  listings ( id, title, base_price, duration, service_variants, custom_variable_groups )
`;

/** Cola de citas activas (confirmadas, en curso o futuras), orden cronológico. */
export const useProviderQueue = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['provider-queue', user?.id],
    enabled: !!user?.id && user.role === 'provider',
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await db
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('provider_id', user!.id)
        .eq('status', 'confirmed')
        .gte('end_time', new Date().toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
};

/** Historial: citas completadas (y confirmadas ya pasadas), más recientes primero. */
export const useProviderHistory = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['provider-history', user?.id],
    enabled: !!user?.id && user.role === 'provider',
    staleTime: 60 * 1000,
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const { data, error } = await db
        .from('appointments')
        .select(APPOINTMENT_SELECT)
        .eq('provider_id', user!.id)
        .or(`status.eq.completed,and(status.eq.confirmed,end_time.lt.${nowIso})`)
        .order('start_time', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
};
