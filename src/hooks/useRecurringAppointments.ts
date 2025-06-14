
import { useMemo } from 'react';
import { addWeeks, addDays, format, isSameDay, startOfDay, endOfDay } from 'date-fns';

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
  // Campos adicionales para compatibilidad
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
    if (!recurringAppointments || recurringAppointments.length === 0) {
      return [];
    }

    const instances: RecurringAppointment[] = [];
    
    recurringAppointments.forEach((appointment) => {
      // Solo procesar citas que tienen recurrencia activa
      if (!appointment.recurrence || appointment.recurrence === 'none' || appointment.status === 'cancelled') {
        return;
      }

      const originalStart = new Date(appointment.start_time);
      const originalEnd = new Date(appointment.end_time);
      const appointmentDuration = originalEnd.getTime() - originalStart.getTime();
      
      let currentDate = new Date(originalStart);
      let instanceCount = 0;
      const maxInstances = 156; // 3 años de instancias semanales

      // Generar instancias futuras basadas en la recurrencia
      while (currentDate <= endDate && instanceCount < maxInstances) {
        // Verificar si esta instancia está dentro del rango solicitado
        if (currentDate >= startDate && currentDate <= endDate) {
          const instanceEnd = new Date(currentDate.getTime() + appointmentDuration);
          
          instances.push({
            id: `${appointment.id}-${format(currentDate, 'yyyy-MM-dd')}`,
            provider_id: appointment.provider_id,
            client_id: appointment.client_id,
            listing_id: appointment.listing_id,
            start_time: currentDate.toISOString(),
            end_time: instanceEnd.toISOString(),
            status: appointment.status,
            recurrence: appointment.recurrence,
            client_name: appointment.client_name || 'Cliente Recurrente',
            service_title: appointment.listings?.title || appointment.service_title || 'Servicio Recurrente',
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
            listings: appointment.listings
          });
        }

        // Calcular la siguiente fecha según el tipo de recurrencia
        switch (appointment.recurrence) {
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            currentDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            currentDate = addDays(currentDate, 30); // Aproximado para mensual
            break;
          default:
            // Si no es una recurrencia válida, salir del bucle
            currentDate = new Date(endDate.getTime() + 1);
            break;
        }
        
        instanceCount++;
      }
    });

    console.log(`Generated ${instances.length} recurring instances from ${recurringAppointments.length} base appointments`);
    return instances;
  }, [recurringAppointments, startDate, endDate]);

  return expandedInstances;
};
