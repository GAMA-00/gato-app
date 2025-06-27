
import { useMemo } from 'react';
import { addWeeks, addDays, addMonths, format, startOfDay, isAfter, isBefore } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

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
  complete_location?: string; // Add this property
  client_data?: any; // Add this property
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

    const instances: RecurringAppointment[] = [];
    
    recurringAppointments.forEach((appointment, index) => {
      console.log(`\n--- Processing recurring appointment ${index + 1}/${recurringAppointments.length} ---`);
      console.log(`ID: ${appointment.id}`);
      console.log(`Client: ${appointment.client_name}`);
      console.log(`Recurrence: ${appointment.recurrence}`);
      console.log(`Original start: ${appointment.start_time}`);
      
      // Validar que tenga recurrencia
      if (!appointment.recurrence || appointment.recurrence === 'none') {
        console.log(`Skipping - no valid recurrence`);
        return;
      }

      const originalStart = new Date(appointment.start_time);
      const originalEnd = new Date(appointment.end_time);
      
      // Calcular duración de la cita
      const durationMs = originalEnd.getTime() - originalStart.getTime();
      
      console.log(`Duration: ${durationMs / (1000 * 60)} minutes`);
      
      // Empezar desde la fecha original
      let currentDate = new Date(originalStart);
      let instanceCount = 0;
      const maxInstances = 50; // Límite de seguridad para evitar bucles infinitos
      
      console.log(`Starting generation from: ${format(currentDate, 'yyyy-MM-dd HH:mm')}`);

      while (instanceCount < maxInstances && isBefore(currentDate, endDate)) {
        // Si la fecha actual está dentro del rango solicitado, crear instancia
        if (!isBefore(currentDate, startDate) && !isAfter(currentDate, endDate)) {
          const instanceEnd = new Date(currentDate.getTime() + durationMs);
          
          // Build complete location for this recurring instance
          const completeLocation = buildAppointmentLocation({
            appointment,
            clientData: appointment.client_data
          });
          
          const newInstance: RecurringAppointment = {
            id: `${appointment.id}-recurring-${format(currentDate, 'yyyy-MM-dd-HH-mm')}`,
            provider_id: appointment.provider_id,
            client_id: appointment.client_id,
            listing_id: appointment.listing_id,
            start_time: currentDate.toISOString(),
            end_time: instanceEnd.toISOString(),
            status: appointment.status,
            recurrence: appointment.recurrence,
            client_name: appointment.client_name || 'Cliente Recurrente',
            service_title: appointment.listings?.title || 'Servicio Recurrente',
            notes: appointment.notes,
            apartment: appointment.apartment,
            client_address: appointment.client_address,
            client_phone: appointment.client_phone,
            client_email: appointment.client_email,
            is_recurring_instance: true,
            provider_name: appointment.provider_name,
            admin_notes: appointment.admin_notes,
            cancellation_time: appointment.cancellation_time,
            refund_percentage: appointment.refund_percentage,
            last_modified_by: appointment.last_modified_by,
            last_modified_at: appointment.last_modified_at,
            created_at: appointment.created_at,
            external_booking: appointment.external_booking || false,
            residencia_id: appointment.residencia_id,
            recurrence_group_id: appointment.recurrence_group_id,
            complete_location: completeLocation, // Add the complete location
            client_data: appointment.client_data || null, // Add client data
            listings: appointment.listings
          };
          
          instances.push(newInstance);
          console.log(`Created instance: ${format(currentDate, 'yyyy-MM-dd HH:mm')} with location: ${completeLocation}`);
        }

        // Avanzar a la siguiente fecha según el tipo de recurrencia
        switch (appointment.recurrence) {
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            currentDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, 1);
            break;
          default:
            console.log(`Unknown recurrence type: ${appointment.recurrence}`);
            currentDate = new Date(endDate.getTime() + 1); // Salir del bucle
            break;
        }
        
        instanceCount++;
      }
      
      const appointmentInstances = instances.filter(i => i.id.startsWith(appointment.id));
      console.log(`Generated ${appointmentInstances.length} instances for this appointment`);
    });

    console.log('=== RECURRING EXPANSION COMPLETE ===');
    console.log(`Total instances generated: ${instances.length}`);
    
    if (instances.length > 0) {
      console.log('Sample instances:', instances.slice(0, 3).map(inst => ({
        id: inst.id.split('-recurring-')[0],
        client_name: inst.client_name,
        start_time: format(new Date(inst.start_time), 'yyyy-MM-dd HH:mm'),
        recurrence: inst.recurrence,
        complete_location: inst.complete_location
      })));
    }
    console.log('======================================');
    
    return instances;
  }, [recurringAppointments, startDate, endDate]);

  return expandedInstances;
};
