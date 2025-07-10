import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, startOfDay, endOfDay, addDays, getDay, addMonths } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

interface UseCalendarRecurringSystemProps {
  selectedDate: Date;
  providerId?: string;
}

interface RecurringRule {
  id: string;
  client_id: string;
  provider_id: string;
  listing_id: string;
  recurrence_type: string;
  start_date: string;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  is_active: boolean;
  client_name: string | null;
  notes: string | null;
  client_address: string | null;
  client_phone: string | null;
  client_email: string | null;
  listings?: { title: string } | { title: string }[] | null;
}

interface CalendarAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  status: string;
  recurrence: string | null;
  client_name: string;
  service_title: string;
  notes: string | null;
  is_recurring_instance: boolean;
  recurring_rule_id?: string;
  complete_location: string;
  external_booking: boolean;
  listings?: { title: string; duration: number } | null;
}

// Deterministic recurring instance generator
function generateRecurringAppointments(
  rules: RecurringRule[],
  startDate: Date,
  endDate: Date,
  existingAppointments: any[] = [],
  serviceMap: Record<string, string> = {}
): CalendarAppointment[] {
  const instances: CalendarAppointment[] = [];
  
  // Create conflict detection ONLY for regular appointments (not recurring instances)
  const existingSlots = new Set(
    existingAppointments.map(apt => `${apt.provider_id}-${apt.start_time}-${apt.end_time}`)
  );
  
  // Track regular appointments by date for conflict detection
  const regularAppointmentsByDate = new Map<string, any[]>();
  existingAppointments.forEach(apt => {
    // Only track regular appointments (not recurring instances) for conflict detection
    if (!apt.is_recurring_instance) {
      const dateKey = format(new Date(apt.start_time), 'yyyy-MM-dd');
      if (!regularAppointmentsByDate.has(dateKey)) {
        regularAppointmentsByDate.set(dateKey, []);
      }
      regularAppointmentsByDate.get(dateKey)!.push(apt);
    }
  });
  
  

  rules.forEach(rule => {
    if (!rule.is_active) return;

    
    
    const ruleStartDate = new Date(rule.start_date);
    let currentDate = new Date(Math.max(ruleStartDate.getTime(), startDate.getTime()));
    
    // Adjust to the correct starting day for this recurrence type
    currentDate = findFirstValidOccurrence(currentDate, rule, ruleStartDate);
    
    let instanceCount = 0;
    const maxInstances = 100; // Increased for better coverage

    while (currentDate <= endDate && instanceCount < maxInstances) {
      // Parse rule times (these are now LOCAL times thanks to migration)
      const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
      const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
      
      // Create instances in LOCAL timezone (rule times are already in local time)
      const instanceStart = new Date(currentDate);
      instanceStart.setHours(startHours, startMinutes, 0, 0);
      
      const instanceEnd = new Date(currentDate);
      instanceEnd.setHours(endHours, endMinutes, 0, 0);

      // IMPORTANT: Rule times are already in local time, instanceStart/End are in local time
      // The calendar expects local times, so we don't need timezone conversion here

      // Check for conflicts with existing appointments
      const slotKey = `${rule.provider_id}-${instanceStart.toISOString()}-${instanceEnd.toISOString()}`;
      const currentDateKey = format(currentDate, 'yyyy-MM-dd');
      
      // Check if there's already a regular appointment for this specific combination
      const existingAppointmentsForDate = regularAppointmentsByDate.get(currentDateKey) || [];
      const hasConflictingAppointment = existingAppointmentsForDate.some(apt => 
        apt.provider_id === rule.provider_id && 
        apt.client_id === rule.client_id && 
        apt.listing_id === rule.listing_id &&
        apt.status !== 'cancelled' &&
        apt.status !== 'rejected'
      );
      
      if (hasConflictingAppointment) {
        console.log(`⚠️ Skipping recurring instance for ${currentDateKey} - regular appointment already exists for same client/provider/listing`);
      } else if (!existingSlots.has(slotKey) && instanceStart >= startDate && instanceStart <= endDate) {
        const instanceId = `recurring-${rule.id}-${format(instanceStart, 'yyyy-MM-dd-HH-mm')}`;
        
        const clientData = {
          name: rule.client_name || 'Cliente',
          condominium_name: null,
          house_number: null,
          residencias: null
        };

        const completeLocation = buildAppointmentLocation({
          appointment: {
            client_address: rule.client_address,
            external_booking: false
          },
          clientData
        });

        instances.push({
          id: instanceId,
          provider_id: rule.provider_id,
          client_id: rule.client_id,
          listing_id: rule.listing_id,
          start_time: instanceStart.toISOString(),
          end_time: instanceEnd.toISOString(),
          status: 'scheduled',
          recurrence: rule.recurrence_type,
          client_name: rule.client_name || 'Cliente',
          service_title: serviceMap[rule.listing_id] || 'Servicio',
          notes: rule.notes,
          is_recurring_instance: true,
          recurring_rule_id: rule.id,
          complete_location: completeLocation,
          external_booking: false
        });

        
      }

      // Move to next occurrence
      currentDate = getNextOccurrence(currentDate, rule, ruleStartDate);
      instanceCount++;
    }
  });

  
  return instances;
}

// Find the first valid occurrence for a recurring rule
function findFirstValidOccurrence(startDate: Date, rule: RecurringRule, ruleStartDate: Date): Date {
  let candidate = new Date(Math.max(startDate.getTime(), ruleStartDate.getTime()));
  
  console.log(`🔍 Finding first occurrence for rule ${rule.id}`);
  console.log(`  Rule start date: ${format(ruleStartDate, 'yyyy-MM-dd')} (day ${getDay(ruleStartDate)})`);
  console.log(`  Search start date: ${format(startDate, 'yyyy-MM-dd')} (day ${getDay(startDate)})`);
  console.log(`  Target day of week: ${rule.day_of_week}`);
  console.log(`  Candidate start: ${format(candidate, 'yyyy-MM-dd')} (day ${getDay(candidate)})`);
  
  switch (rule.recurrence_type) {
    case 'weekly':
      // If we're starting from the rule's start date and it matches, use it
      if (candidate.getTime() === ruleStartDate.getTime() && getDay(candidate) === rule.day_of_week) {
        console.log(`  ✅ Using rule start date directly: ${format(candidate, 'yyyy-MM-dd')}`);
        return candidate;
      }
      
      // Find next occurrence of the target day of week
      while (getDay(candidate) !== rule.day_of_week) {
        candidate = addDays(candidate, 1);
      }
      console.log(`  ✅ Found weekly occurrence: ${format(candidate, 'yyyy-MM-dd')}`);
      break;
      
    case 'biweekly':
      // Find next occurrence that's on correct day and 2-week cycle
      while (getDay(candidate) !== rule.day_of_week) {
        candidate = addDays(candidate, 1);
      }
      
      // Ensure it's on the correct biweekly cycle
      while (true) {
        const daysDiff = Math.floor((candidate.getTime() - ruleStartDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff % 14 === 0) {
          break;
        }
        candidate = addDays(candidate, 7);
      }
      console.log(`  ✅ Found biweekly occurrence: ${format(candidate, 'yyyy-MM-dd')}`);
      break;
      
    case 'monthly':
      // Set to the correct day of month
      candidate.setDate(rule.day_of_month || 1);
      if (candidate < startDate) {
        candidate = addMonths(candidate, 1);
        candidate.setDate(rule.day_of_month || 1);
      }
      console.log(`  ✅ Found monthly occurrence: ${format(candidate, 'yyyy-MM-dd')}`);
      break;
  }
  
  return candidate;
}

// Get the next occurrence for a recurring rule
function getNextOccurrence(currentDate: Date, rule: RecurringRule, ruleStartDate: Date): Date {
  switch (rule.recurrence_type) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return addDays(currentDate, 1); // Fallback
  }
}

export const useCalendarRecurringSystem = ({ 
  selectedDate, 
  providerId 
}: UseCalendarRecurringSystemProps) => {
  // Extended date range: 2 weeks back, 16 weeks forward for better recurring coverage
  const startDate = startOfDay(addWeeks(selectedDate, -2));
  const endDate = endOfDay(addWeeks(selectedDate, 16));


  return useQuery({
    queryKey: ['calendar-recurring-system', format(selectedDate, 'yyyy-MM-dd'), providerId],
    queryFn: async () => {
      if (!providerId) {
        console.log('❌ No provider ID provided');
        return [];
      }


      // 1. Fetch all regular appointments in range
      const { data: regularAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          listings(title, duration)
        `)
        .eq('provider_id', providerId)
        .in('status', ['pending', 'confirmed', 'completed', 'scheduled'])
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (appointmentsError) {
        console.error('❌ Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }


      // 2. Fetch active recurring rules (without listings join since no FK exists)
      const { data: recurringRules, error: rulesError } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (rulesError) {
        console.error('❌ Error fetching recurring rules:', rulesError);
        throw rulesError;
      }

      

      // 3. Get service titles for recurring rules
      let serviceMap: Record<string, string> = {};
      if (recurringRules && recurringRules.length > 0) {
        const listingIds = [...new Set(recurringRules.map(rule => rule.listing_id))];
        if (listingIds.length > 0) {
          const { data: listings } = await supabase
            .from('listings')
            .select('id, title')
            .in('id', listingIds);
          
          if (listings) {
            serviceMap = listings.reduce((acc, listing) => {
              acc[listing.id] = listing.title;
              return acc;
            }, {} as Record<string, string>);
          }
        }

        // 4. Enrich client names for recurring rules
        const clientIds = recurringRules.map(rule => rule.client_id).filter(Boolean);
        if (clientIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, name')
            .in('id', clientIds);
          
          if (users) {
            const userMap = users.reduce((acc, user) => {
              acc[user.id] = user.name;
              return acc;
            }, {} as Record<string, string>);
            
            recurringRules.forEach(rule => {
              if (!rule.client_name && rule.client_id && userMap[rule.client_id]) {
                rule.client_name = userMap[rule.client_id];
              }
            });
          }
        }
      }

      // 5. Generate recurring instances
      const recurringInstances = generateRecurringAppointments(
        recurringRules || [],
        startDate,
        endDate,
        regularAppointments || [],
        serviceMap
      );

      // 5. Process and combine all appointments
      const processedRegular = (regularAppointments || []).map(appointment => ({
        ...appointment,
        is_recurring_instance: appointment.is_recurring_instance || false,
        client_name: appointment.client_name || 'Cliente',
        service_title: appointment.listings?.title || 'Servicio',
        complete_location: buildAppointmentLocation({
          appointment,
          clientData: null
        })
      }));

      // 6. Combine and deduplicate
      const allAppointments = [...processedRegular, ...recurringInstances];
      
      // Remove duplicates with preference for regular appointments
      const uniqueAppointments = allAppointments.reduce((acc, appointment) => {
        const key = `${appointment.provider_id}-${appointment.start_time}-${appointment.end_time}`;
        
        if (!acc.has(key)) {
          acc.set(key, appointment);
        } else {
          const existing = acc.get(key);
          // Prefer regular appointments over recurring instances
          if (!existing.is_recurring_instance && appointment.is_recurring_instance) {
            console.log(`⚠️  Skipping duplicate recurring instance for ${appointment.start_time}`);
          } else if (existing.is_recurring_instance && !appointment.is_recurring_instance) {
            acc.set(key, appointment);
            console.log(`🔄 Replaced recurring instance with regular appointment for ${appointment.start_time}`);
          }
        }
        
        return acc;
      }, new Map());

      const finalAppointments = Array.from(uniqueAppointments.values());


      return finalAppointments;
    },
    staleTime: 30 * 1000, // 30 seconds cache (shorter for testing)
    refetchInterval: false,
    enabled: !!providerId,
    refetchOnWindowFocus: true
  });
};