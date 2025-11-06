/**
 * Unified Recurring Appointments Hook
 * Combines real appointments from DB with virtually calculated recurring instances
 * Ensures consistency across Calendar, Dashboard, and Bookings sections
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { 
  getAllRecurringInstances, 
  type RecurringAppointment,
  type RecurringException,
  type CalculatedRecurringInstance 
} from '@/utils/simplifiedRecurrenceUtils';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

export interface UnifiedAppointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  recurrence: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  client_name?: string;
  provider_name?: string;
  client_address?: string;
  notes?: string;
  is_recurring_instance: boolean;
  original_appointment_id?: string;
  source_type: 'appointment' | 'virtual_instance';
  recurrence_group_id?: string;
  recurring_rule_id?: string;
  external_booking?: boolean;
  complete_location?: string;
  client_data?: any;
  listings?: any;
  service_title?: string;
  rescheduled_style?: string;
  reschedule_notes?: string;
}

interface UseUnifiedRecurringAppointmentsOptions {
  userId?: string;
  userRole?: 'client' | 'provider';
  startDate?: Date;
  endDate?: Date;
  includeCompleted?: boolean;
}

export const useUnifiedRecurringAppointments = ({
  userId,
  userRole,
  startDate = new Date(),
  endDate = addDays(new Date(), 365),
  includeCompleted = true
}: UseUnifiedRecurringAppointmentsOptions) => {
  
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = endOfDay(endDate);
  const normalizedStartKey = normalizedStart.toISOString().slice(0, 10);
  const normalizedEndKey = normalizedEnd.toISOString().slice(0, 10);
  
  return useQuery({
    queryKey: ['unified-recurring-appointments', userId, userRole, normalizedStartKey, normalizedEndKey],
    queryFn: async (): Promise<UnifiedAppointment[]> => {
      if (!userId || !userRole) return [];

      console.log('=== UNIFIED RECURRING APPOINTMENTS CALCULATION ===');
      console.log('User:', userId, 'Role:', userRole);
      console.log('Date range:', normalizedStart.toISOString(), 'to', normalizedEnd.toISOString());

      // 1. Fetch real appointments from database
      const statusFilter = includeCompleted 
        ? ['pending', 'confirmed', 'completed', 'cancelled', 'rejected']
        : ['pending', 'confirmed'];

      const roleFilter = userRole === 'client' ? 'client_id' : 'provider_id';

      const { data: realAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          recurrence,
          provider_id,
          client_id,
          listing_id,
          client_name,
          provider_name,
          client_address,
          notes,
          is_recurring_instance,
          recurrence_group_id,
          recurring_rule_id,
          external_booking,
          final_price,
          custom_variables_total_price,
          custom_variable_selections,
          listings (
            id,
            title,
            is_post_payment,
            base_price,
            duration,
            service_variants,
            custom_variable_groups
          )
        `)
        .eq(roleFilter, userId)
        .in('status', statusFilter)
        .gte('start_time', normalizedStart.toISOString())
        .lte('start_time', normalizedEnd.toISOString())
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log(`Fetched ${realAppointments?.length || 0} real appointments from DB`);

      // 2. Separate materialized instances from potential base appointments
      const materializedInstances = (realAppointments || []).filter(apt => 
        apt.is_recurring_instance === true
      );

      const nonRecurringAppointments = (realAppointments || []).filter(apt =>
        !apt.recurrence || apt.recurrence === 'none' || apt.recurrence === 'once'
      );

      // Only look for base appointments if they explicitly have is_recurring_instance === false
      const recurringBaseAppointments = (realAppointments || []).filter(apt => 
        apt.recurrence && 
        apt.recurrence !== 'none' && 
        apt.recurrence !== 'once' &&
        apt.is_recurring_instance === false // Explicitly false, not just falsy
      );

      console.log(`Found ${materializedInstances.length} materialized instances`);
      console.log(`Found ${nonRecurringAppointments.length} non-recurring appointments`);
      console.log(`Found ${recurringBaseAppointments.length} recurring base appointments IN RANGE`);

      // 2b. Fetch ALL recurring base appointments (not limited by start date range)
      // This ensures we capture recurring series that started before our range but have future instances
      const { data: recurringBaseAll, error: baseAllError } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          recurrence,
          provider_id,
          client_id,
          listing_id,
          client_name,
          provider_name,
          client_address,
          notes,
          is_recurring_instance,
          recurrence_group_id,
          recurring_rule_id,
          external_booking,
          final_price,
          custom_variables_total_price,
          custom_variable_selections,
          listings (
            id,
            title,
            is_post_payment,
            base_price,
            duration,
            service_variants,
            custom_variable_groups
          )
        `)
        .eq(roleFilter, userId)
        .neq('recurrence', 'none')
        .neq('recurrence', 'once')
        .eq('is_recurring_instance', false)
        .in('status', ['confirmed', 'pending', 'completed'])
        .lte('start_time', normalizedEnd.toISOString());

      if (baseAllError) {
        console.error('Error fetching all recurring bases:', baseAllError);
      }

      console.log(`Fetched ${recurringBaseAll?.length || 0} total recurring base appointments (all time)`);

      // 2c. Unify recurring bases: combine in-range and all-time bases, removing duplicates
      const baseById = new Map();
      recurringBaseAppointments.forEach(b => baseById.set(b.id, b));
      (recurringBaseAll || []).forEach(b => baseById.set(b.id, b));
      const unifiedBaseAppointments = Array.from(baseById.values());

      console.log(`Unified ${unifiedBaseAppointments.length} unique recurring base appointments for calculation`);

      // 3. Fetch client data for building locations
      const clientIds = Array.from(new Set([
        ...((realAppointments || []).map(a => a.client_id).filter(Boolean) as string[]),
        ...((unifiedBaseAppointments || []).map((a: any) => a.client_id).filter(Boolean) as string[]),
      ]));

      let clientsMap = new Map<string, any>();
      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('users')
          .select(`
            id,
            name,
            house_number,
            condominium_text,
            condominium_name,
            residencia_id,
            residencias (
              id,
              name
            )
          `)
          .in('id', clientIds);

        if (clientsError) {
          console.warn('Users fetch failed; falling back to appointment data for locations', clientsError);
        } else if (clients && clients.length > 0) {
          clientsMap = new Map(clients.map((c: any) => [c.id, c]));
          console.log(`Fetched ${clients.length} client profiles for location building`);
        }
      }

      // 4. Fetch exceptions for these recurring appointments
      let exceptions: RecurringException[] = [];
      if (unifiedBaseAppointments.length > 0) {
        const appointmentIds = unifiedBaseAppointments.map(a => a.id);
        const { data: exceptionsData, error: exceptionsError } = await supabase
          .from('recurring_exceptions')
          .select('*')
          .in('appointment_id', appointmentIds);

        if (exceptionsError) {
          console.error('Error fetching exceptions:', exceptionsError);
        } else {
          exceptions = (exceptionsData || []).map(ex => ({
            ...ex,
            action_type: ex.action_type as 'cancelled' | 'rescheduled'
          })) as RecurringException[];
          console.log(`Fetched ${exceptions.length} exceptions`);
        }
      }

      // 4. Calculate virtual instances for recurring appointments
      const virtualInstances: CalculatedRecurringInstance[] = unifiedBaseAppointments.length > 0
        ? getAllRecurringInstances(
            unifiedBaseAppointments as RecurringAppointment[],
            exceptions,
            startDate,
            endDate,
            userRole === 'provider' ? userId : undefined
          )
        : [];

      console.log(`Calculated ${virtualInstances.length} virtual recurring instances`);

      // 5. Convert virtual instances to UnifiedAppointment format
      const now = new Date();
      const virtualAppointments: UnifiedAppointment[] = virtualInstances
        .filter(instance => instance.status !== 'cancelled') // Skip cancelled instances
        .map(instance => {
          const baseAppointment = instance.original_appointment;
          // Cast to any to access extended properties from DB query
          const fullAppointment = baseAppointment as any;
          
          // Use rescheduled times if available, otherwise use calculated times
          const startTime = instance.new_start_time ?? instance.start_time;
          const endTime = instance.new_end_time ?? instance.end_time;
          
          // Compute instance-specific status based on actual time, not base appointment status
          const computedStatus = 
            endTime < now
              ? 'completed'
              : (baseAppointment.status === 'completed' 
                  ? 'confirmed'  // If base is completed, future instances are still confirmed
                  : (baseAppointment.status === 'pending' ? 'pending' : 'confirmed'));
          
          // Check if this instance was rescheduled
          const rescheduledStyle = 
            instance.status === 'rescheduled' 
              ? 'bg-orange-100 border-orange-300 text-orange-700' 
              : undefined;
          
          // Build complete location for virtual instance using client data when available
          const clientData = clientsMap.get(baseAppointment.client_id);
          const complete_location = buildAppointmentLocation({
            appointment: fullAppointment,
            clientData
          });
          
          return {
            id: `virtual-${baseAppointment.id}-${startTime.toISOString()}`,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: computedStatus,
            recurrence: baseAppointment.recurrence,
            recurrence_group_id: fullAppointment.recurrence_group_id,
            recurring_rule_id: fullAppointment.recurring_rule_id,
            provider_id: baseAppointment.provider_id,
            client_id: baseAppointment.client_id,
            listing_id: baseAppointment.listing_id,
            client_name: baseAppointment.client_name || clientData?.name,
            provider_name: baseAppointment.provider_name,
            client_address: fullAppointment.client_address,
            notes: baseAppointment.notes,
            is_recurring_instance: true,
            original_appointment_id: baseAppointment.id,
            source_type: 'virtual_instance' as const,
            external_booking: false,
            rescheduled_style: rescheduledStyle,
            reschedule_notes: instance.exception?.notes,
            listings: fullAppointment.listings,
            service_title: fullAppointment.listings?.title,
            complete_location,
            client_data: clientData || null,
          };
        });

      console.log(`Created ${virtualAppointments.length} virtual appointment objects`);

      // 6. Map only materialized instances and non-recurring appointments (skip base appointments that will be virtually calculated)
      const realAppointmentsMapped: UnifiedAppointment[] = [
        ...materializedInstances,
        ...nonRecurringAppointments
      ].map(apt => {
        // Build complete location for each appointment using client data when available
        const clientData = clientsMap.get(apt.client_id);
        const complete_location = buildAppointmentLocation({
          appointment: apt,
          clientData
        });
        
        return {
          ...apt,
          source_type: 'appointment' as const,
          service_title: apt.listings?.title,
          complete_location,
          client_data: clientData || null,
        };
      });

      console.log(`Mapped ${realAppointmentsMapped.length} real appointments (materialized + non-recurring)`);

      const allAppointments = [...realAppointmentsMapped, ...virtualAppointments];

      // 7. Deduplicate: prioritize real appointments over virtual instances
      const deduplicationMap = new Map<string, UnifiedAppointment>();

      allAppointments.forEach(apt => {
        const key = `${apt.start_time}-${apt.provider_id}-${apt.client_id}-${apt.listing_id}`;
        const existing = deduplicationMap.get(key);

        if (!existing) {
          deduplicationMap.set(key, apt);
        } else {
          // Prioritize real appointments over virtual instances
          if (apt.source_type === 'appointment' && existing.source_type === 'virtual_instance') {
            deduplicationMap.set(key, apt);
            console.log(`Replaced virtual instance with real appointment at ${apt.start_time}`);
          }
        }
      });

      const unifiedAppointments = Array.from(deduplicationMap.values());

      // 8. Sort chronologically
      unifiedAppointments.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );

      console.log(`=== UNIFIED RESULT: ${unifiedAppointments.length} total appointments ===`);
      console.log(`Real: ${realAppointmentsMapped.length}, Virtual: ${virtualAppointments.length}, Deduplicated: ${unifiedAppointments.length}`);

      // 9. Filter out cancelled, rejected, and optionally completed appointments
      let filteredUnified = unifiedAppointments.filter(a => !['cancelled', 'rejected'].includes(a.status));
      
      if (!includeCompleted) {
        filteredUnified = filteredUnified.filter(a => a.status !== 'completed');
        console.log(`Filtered out cancelled/rejected/completed. Final count: ${filteredUnified.length}`);
      } else {
        console.log(`Filtered out cancelled/rejected. Final count: ${filteredUnified.length}`);
      }

      return filteredUnified;
    },
    enabled: !!userId && !!userRole,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
};
