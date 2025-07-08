import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addWeeks, addMonths, getDay, startOfDay } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

interface UseOptimizedRecurringInstancesProps {
  providerId?: string;
  startDate: Date;
  endDate: Date;
  regularAppointments: any[];
}

export const useOptimizedRecurringInstances = ({
  providerId,
  startDate,
  endDate,
  regularAppointments
}: UseOptimizedRecurringInstancesProps) => {
  
  return useQuery({
    queryKey: ['optimized-recurring-instances', providerId, format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!providerId) return [];

      console.log('🔄 Fetching recurring rules...');
      
      // Get recurring rules from database
      const { data: recurringRules, error } = await supabase
        .from('recurring_rules')
        .select(`
          *,
          listings(title)
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching recurring rules:', error);
        throw error;
      }

      console.log(`📋 Found ${recurringRules?.length || 0} active recurring rules`);

      if (!recurringRules || recurringRules.length === 0) {
        return [];
      }

      // Generate optimized recurring instances
      const allInstances: any[] = [];

      recurringRules.forEach(rule => {
        console.log(`⚙️ Processing rule: ${rule.id} (${rule.recurrence_type})`);
        
        const instances = generateOptimizedRecurringInstances(
          rule,
          startDate,
          endDate,
          regularAppointments
        );
        
        allInstances.push(...instances);
        console.log(`  ✅ Generated ${instances.length} instances`);
      });

      console.log(`🎯 Total recurring instances generated: ${allInstances.length}`);
      return allInstances;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache for recurring rules
    refetchInterval: false,
    enabled: !!providerId
  });
};

// Optimized recurring instance generation
function generateOptimizedRecurringInstances(
  rule: any,
  startDate: Date,
  endDate: Date,
  existingAppointments: any[]
): any[] {
  const instances: any[] = [];
  
  // Calculate starting point
  const ruleStartDate = startOfDay(new Date(rule.start_date));
  let currentDate = new Date(Math.max(ruleStartDate.getTime(), startDate.getTime()));
  
  // Get service title
  const serviceTitle = Array.isArray(rule.listings) 
    ? rule.listings[0]?.title || 'Servicio'
    : rule.listings?.title || 'Servicio';

  // Generate instances based on recurrence type
  let instanceCount = 0;
  const maxInstances = 20; // Limit to prevent infinite loops
  
  while (currentDate <= endDate && instanceCount < maxInstances) {
    let nextOccurrence: Date | null = null;
    
    switch (rule.recurrence_type) {
      case 'weekly':
        nextOccurrence = findNextWeeklyOccurrence(currentDate, rule.day_of_week);
        break;
      case 'biweekly':
        nextOccurrence = findNextBiweeklyOccurrence(currentDate, rule.day_of_week, ruleStartDate);
        break;
      case 'monthly':
        nextOccurrence = findNextMonthlyOccurrence(currentDate, rule.day_of_month);
        break;
      default:
        console.warn(`Unknown recurrence type: ${rule.recurrence_type}`);
        break;
    }
    
    if (!nextOccurrence || nextOccurrence > endDate) {
      break;
    }
    
    // Create instance datetime
    const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
    const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
    
    const instanceStart = new Date(nextOccurrence);
    instanceStart.setHours(startHours, startMinutes, 0, 0);
    
    const instanceEnd = new Date(nextOccurrence);
    instanceEnd.setHours(endHours, endMinutes, 0, 0);
    
    // Check for conflicts with existing appointments
    const hasConflict = existingAppointments.some(apt => {
      const aptStart = new Date(apt.start_time);
      return Math.abs(aptStart.getTime() - instanceStart.getTime()) < 60000; // 1 minute tolerance
    });
    
    if (!hasConflict && instanceStart >= startDate && instanceStart <= endDate) {
      const instanceId = `${rule.id}-instance-${format(instanceStart, 'yyyy-MM-dd-HH-mm')}`;
      
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
        status: 'confirmed',
        recurrence: rule.recurrence_type,
        client_name: rule.client_name || 'Cliente',
        service_title: serviceTitle,
        notes: rule.notes,
        is_recurring_instance: true,
        recurring_rule_id: rule.id,
        complete_location: completeLocation,
        external_booking: false,
        client_data: clientData
      });
    }
    
    // Move to next potential occurrence
    switch (rule.recurrence_type) {
      case 'weekly':
        currentDate = addWeeks(nextOccurrence, 1);
        break;
      case 'biweekly':
        currentDate = addWeeks(nextOccurrence, 2);
        break;
      case 'monthly':
        currentDate = addMonths(nextOccurrence, 1);
        break;
    }
    
    instanceCount++;
  }
  
  return instances;
}

// Helper functions for finding next occurrences
function findNextWeeklyOccurrence(currentDate: Date, dayOfWeek: number): Date {
  const result = new Date(currentDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0 && result.getTime() === currentDate.getTime()) {
    // If it's the same day and time, return current date
    return result;
  }
  
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

function findNextBiweeklyOccurrence(currentDate: Date, dayOfWeek: number, startDate: Date): Date {
  let candidate = findNextWeeklyOccurrence(currentDate, dayOfWeek);
  
  // Ensure it's on the correct biweekly cycle
  while (candidate <= currentDate) {
    candidate = addWeeks(candidate, 1);
  }
  
  // Check if it's on the correct 2-week cycle from start date
  while (true) {
    const daysDiff = Math.floor((candidate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff >= 0 && daysDiff % 14 === 0) {
      break;
    }
    candidate = addWeeks(candidate, 1);
  }
  
  return candidate;
}

function findNextMonthlyOccurrence(currentDate: Date, dayOfMonth: number): Date {
  const result = new Date(currentDate);
  result.setDate(dayOfMonth);
  
  // If the date is already past this month, move to next month
  if (result <= currentDate) {
    result.setMonth(result.getMonth() + 1);
    result.setDate(dayOfMonth);
  }
  
  return result;
}