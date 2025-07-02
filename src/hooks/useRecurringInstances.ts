import { useMemo } from 'react';
import { addWeeks, addMonths, format, isAfter, isBefore, getDay } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

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
}

interface RecurringInstance {
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
  notes: string | null;
  is_recurring_instance: boolean;
  recurring_rule_id: string;
  complete_location: string;
  external_booking: boolean;
  client_data?: any;
}

interface UseRecurringInstancesProps {
  recurringRules: RecurringRule[];
  startDate: Date;
  endDate: Date;
  existingAppointments?: any[];
}

export const generateRecurringInstances = (
  recurringRules: RecurringRule[], 
  startDate: Date, 
  endDate: Date,
  existingAppointments: any[] = []
): RecurringInstance[] => {
    console.log('=== GENERATING RECURRING INSTANCES ===');
    console.log(`Rules to process: ${recurringRules.length}`);
    console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    const instances: RecurringInstance[] = [];

    recurringRules.forEach(rule => {
      if (!rule.is_active) return;

      console.log(`Processing rule ${rule.id} - ${rule.recurrence_type}`);
      
      const ruleStartDate = new Date(rule.start_date);
      let currentDate = new Date(Math.max(ruleStartDate.getTime(), startDate.getTime()));
      
      // Ajustar currentDate al próximo día de la semana correcto para weekly/biweekly
      if (rule.recurrence_type === 'weekly' || rule.recurrence_type === 'biweekly') {
        const targetDayOfWeek = rule.day_of_week!;
        const currentDayOfWeek = getDay(currentDate);
        
        if (currentDayOfWeek !== targetDayOfWeek) {
          const daysToAdd = (targetDayOfWeek - currentDayOfWeek + 7) % 7;
          currentDate = addWeeks(currentDate, 0);
          currentDate.setDate(currentDate.getDate() + daysToAdd);
        }
      }

      // Generar instancias hasta la fecha final
      const maxInstances = 50; // Límite de seguridad
      let instanceCount = 0;

      while (currentDate <= endDate && instanceCount < maxInstances) {
        const startDateTime = new Date(currentDate);
        const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
        startDateTime.setHours(startHours, startMinutes, 0, 0);

        const endDateTime = new Date(currentDate);
        const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
        endDateTime.setHours(endHours, endMinutes, 0, 0);

        // Verificar si ya existe una cita para esta fecha/hora exacta
        const existingConflict = existingAppointments.some(apt => {
          const aptStart = new Date(apt.start_time);
          return Math.abs(aptStart.getTime() - startDateTime.getTime()) < 60000; // 1 minuto de tolerancia
        });

        if (!existingConflict && startDateTime >= startDate && startDateTime <= endDate) {
          const instanceId = `${rule.id}-instance-${format(startDateTime, 'yyyy-MM-dd-HH-mm')}`;
          
          const clientData = {
            name: rule.client_name,
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
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'confirmed',
            recurrence: rule.recurrence_type,
            client_name: rule.client_name || 'Cliente Recurrente',
            service_title: 'Servicio Recurrente',
            notes: rule.notes,
            is_recurring_instance: true,
            recurring_rule_id: rule.id,
            complete_location: completeLocation,
            external_booking: false,
            client_data: clientData
          });

          console.log(`Generated instance: ${format(startDateTime, 'yyyy-MM-dd HH:mm')} (${rule.recurrence_type})`);
        }

        // Avanzar a la siguiente ocurrencia
        switch (rule.recurrence_type) {
          case 'weekly':
            currentDate = addWeeks(currentDate, 1);
            break;
          case 'biweekly':
            currentDate = addWeeks(currentDate, 2);
            break;
          case 'monthly':
            currentDate = addMonths(currentDate, 1);
            // Para mensual, asegurar que sea el mismo día del mes
            if (rule.day_of_month) {
              currentDate.setDate(rule.day_of_month);
            }
            break;
          default:
            // Salir del bucle si no es un tipo conocido
            break;
        }

        instanceCount++;
      }

      console.log(`Generated ${instances.length} instances for rule ${rule.id}`);
    });

  console.log(`Total instances generated: ${instances.length}`);
  return instances;
};

// Hook para obtener reglas recurrentes activas
export const useRecurringRules = (providerId?: string) => {
  // Este hook se puede implementar más tarde si es necesario
  return {
    data: [],
    isLoading: false,
    error: null
  };
};

// Hook para generar instancias automáticamente
export const useAutoGenerateInstances = () => {
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};

// Hook para generar instancias recurrentes
export const useGenerateRecurringInstances = () => {
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};