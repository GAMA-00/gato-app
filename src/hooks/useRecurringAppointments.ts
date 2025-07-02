
import { useMemo } from 'react';
import { format, isAfter, isBefore } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';
import { generateRecurringInstances, debugRecurrence, isRecurring } from '@/utils/recurrenceUtils';

interface RecurringAppointment {
  id: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  start_time: string;
  end_time: string;
  status: string;
  recurrence: string;
  client_name: string;
  service_title: string;
  notes?: string;
  apartment?: string;
  client_address?: string;
  client_phone?: string;
  client_email?: string;
  is_recurring_instance: boolean;
  provider_name?: string;
  admin_notes?: string;
  cancellation_time?: string;
  refund_percentage?: number;
  last_modified_by?: string;
  last_modified_at?: string;
  created_at: string;
  external_booking: boolean;
  residencia_id?: string;
  recurrence_group_id?: string;
  complete_location?: string;
  client_data?: any;
  // Add properties needed for location building
  condominium_text?: string;
  condominium_name?: string;
  house_number?: string;
  residencias?: {
    name: string;
  };
  listings?: {
    title: string;
    duration: number;
  };
}

interface UseRecurringAppointmentsProps {
  recurringAppointments: any[];
  startDate: Date;
  endDate: Date;
}

export const useRecurringAppointments = ({ 
  recurringAppointments, 
  startDate, 
  endDate 
}: UseRecurringAppointmentsProps) => {
  
  const expandedInstances = useMemo(() => {
    console.log('=== RECURRING APPOINTMENTS EXPANSION START ===');
    console.log(`Input recurring appointments: ${recurringAppointments.length}`);
    console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    if (!recurringAppointments || recurringAppointments.length === 0) {
      console.log('No recurring appointments to expand');
      return [];
    }

    const allInstances: RecurringAppointment[] = [];
    
    recurringAppointments.forEach((appointment, index) => {
      console.log(`\n--- Processing recurring appointment ${index + 1}/${recurringAppointments.length} ---`);
      debugRecurrence(appointment, `Appointment ${index + 1}: `);
      
      // Skip non-recurring appointments using centralized validation
      if (!isRecurring(appointment.recurrence)) {
        console.log(`Skipping - no valid recurrence`);
        return;
      }

      // Generate instances using centralized logic
      const appointmentInstances = generateRecurringInstances(appointment, startDate, endDate);
      
      // Add location data to each instance
      const enhancedInstances = appointmentInstances.map(instance => {
        const completeLocation = buildAppointmentLocation({
          appointment,
          clientData: appointment.client_data
        });

        return {
          ...instance,
          client_name: appointment.client_name || 'Cliente Recurrente',
          service_title: appointment.listings?.title || 'Servicio Recurrente',
          complete_location: completeLocation,
          // Add location-related properties from client_data or appointment
          condominium_text: appointment.client_data?.condominium_text || appointment.condominium_text,
          condominium_name: appointment.client_data?.condominium_name || appointment.condominium_name,
          house_number: appointment.client_data?.house_number || appointment.house_number,
          residencias: appointment.client_data?.residencias || appointment.residencias,
        };
      });
      
      allInstances.push(...enhancedInstances);
      console.log(`Generated ${enhancedInstances.length} instances for appointment ${appointment.id}`);
    });

    console.log('=== RECURRING EXPANSION COMPLETE ===');
    console.log(`Total instances generated: ${allInstances.length}`);
    
    if (allInstances.length > 0) {
      console.log('Sample instances:', allInstances.slice(0, 3).map(inst => ({
        id: inst.id.split('-recurring-')[0],
        client_name: inst.client_name,
        start_time: format(new Date(inst.start_time), 'yyyy-MM-dd HH:mm'),
        recurrence: inst.recurrence,
        complete_location: inst.complete_location
      })));
    }
    console.log('======================================');
    
    return allInstances;
  }, [recurringAppointments, startDate, endDate]);

  return expandedInstances;
};
