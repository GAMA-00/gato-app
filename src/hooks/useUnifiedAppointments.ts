import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UnifiedAppointment {
  id: string;
  listing_id: string;
  provider_id: string;
  client_id: string | null;
  residencia_id: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  recurrence: string | null;
  notes: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  created_at: string;
  is_recurring_instance: boolean;
  recurrence_group_id: string | null;
  external_booking: boolean;
  final_price: number | null;
  price_finalized: boolean;
  source_type: 'appointment' | 'recurring_instance';
  created_from: string | null;
  created_by_user: string | null;
}

interface UseUnifiedAppointmentsOptions {
  userRole?: 'client' | 'provider';
  includeCompleted?: boolean;
  startDate?: Date;
  endDate?: Date;
}

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'] as const;

export function useUnifiedAppointments(options: UseUnifiedAppointmentsOptions = {}) {
  const { user } = useAuth();
  const { userRole, includeCompleted = true, startDate, endDate } = options;

  return useQuery({
    queryKey: ['unified-appointments', user?.id, userRole, includeCompleted, startDate, endDate],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Build base query
      let query = supabase
        .from('unified_appointments')
        .select('*');

      // Filter by user role
      if (userRole === 'client') {
        query = query.eq('client_id', user.id);
      } else if (userRole === 'provider') {
        query = query.eq('provider_id', user.id);
      }

      // Filter by status - always include active statuses
      const statusFilter = includeCompleted 
        ? VALID_STATUSES
        : ['pending', 'confirmed'];
      
      query = query.in('status', statusFilter);

      // Filter by date range if provided
      if (startDate) {
        query = query.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('start_time', endDate.toISOString());
      }

      // Order by start time
      query = query.order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching unified appointments:', error);
        throw error;
      }

      // Deduplicate by unique key: same time slot + provider + client + listing
      const appointmentMap = new Map<string, UnifiedAppointment>();
      
      (data || []).forEach((apt) => {
        const timeSlotKey = `${apt.start_time}-${apt.provider_id}-${apt.client_id}-${apt.listing_id}`;
        const existing = appointmentMap.get(timeSlotKey);

        if (!existing) {
          appointmentMap.set(timeSlotKey, apt as UnifiedAppointment);
        } else {
          // Priority: appointment > recurring_instance
          // This prevents duplicates between base appointments and generated instances
          if (apt.source_type === 'appointment' && existing.source_type === 'recurring_instance') {
            appointmentMap.set(timeSlotKey, apt as UnifiedAppointment);
          }
          // If both are same type, keep the one with most recent created_at
          else if (apt.source_type === existing.source_type) {
            const aptDate = new Date(apt.created_at).getTime();
            const existingDate = new Date(existing.created_at).getTime();
            if (aptDate > existingDate) {
              appointmentMap.set(timeSlotKey, apt as UnifiedAppointment);
            }
          }
        }
      });

      return Array.from(appointmentMap.values()).sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
    retryDelay: 1000,
  });
}
