import { addWeeks, addMonths, format, getDay } from 'date-fns';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

export interface RecurringRule {
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
  [key: string]: any;
}

export interface RecurringInstance {
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

export const generateRecurringInstances = (
  recurringRules: RecurringRule[], 
  startDate: Date, 
  endDate: Date,
  existingAppointments: any[] = []
): RecurringInstance[] => {
  console.log('🔄 === GENERATING RECURRING INSTANCES ===');
  console.log(`Rules to process: ${recurringRules.length}`);
  console.log(`Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  const instances: RecurringInstance[] = [];

  recurringRules.forEach(rule => {
    if (!rule.is_active) return;

    console.log(`Processing rule ${rule.id} - ${rule.recurrence_type} for ${rule.client_name}`);
    
    const ruleStartDate = new Date(rule.start_date);
    let currentDate = new Date(Math.max(ruleStartDate.getTime(), startDate.getTime()));
    
    // Ajustar al próximo día correcto para weekly/biweekly
    if (rule.recurrence_type === 'weekly' || rule.recurrence_type === 'biweekly') {
      const targetDayOfWeek = rule.day_of_week!;
      
      // Buscar la primera ocurrencia válida
      while (getDay(currentDate) !== targetDayOfWeek && currentDate <= endDate) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Para biweekly, asegurar que esté en la semana correcta
      if (rule.recurrence_type === 'biweekly') {
        while (currentDate <= endDate) {
          const daysDiff = Math.floor((currentDate.getTime() - ruleStartDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff >= 0 && daysDiff % 14 === 0) {
            break; // Fecha biweekly válida
          }
          currentDate.setDate(currentDate.getDate() + 7);
        }
      }
    }

    // Generar instancias hasta la fecha final
    const maxInstances = 50;
    let instanceCount = 0;

    while (currentDate <= endDate && instanceCount < maxInstances) {
      const startDateTime = new Date(currentDate);
      const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(currentDate);
      const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Verificar conflictos existentes
      const existingConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.start_time);
        return Math.abs(aptStart.getTime() - startDateTime.getTime()) < 60000;
      });

      if (!existingConflict && startDateTime >= startDate && startDateTime <= endDate) {
        const instanceId = `${rule.id}-instance-${format(startDateTime, 'yyyy-MM-dd-HH-mm')}`;
        
        const clientName = rule.client_name || 'Cliente';
        const serviceTitle = Array.isArray(rule.listings) 
          ? rule.listings[0]?.title || 'Servicio'
          : rule.listings?.title || 'Servicio';
        
        const clientData = {
          name: clientName,
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
          client_name: clientName,
          service_title: serviceTitle,
          notes: rule.notes,
          is_recurring_instance: true,
          recurring_rule_id: rule.id,
          complete_location: completeLocation,
          external_booking: false,
          client_data: clientData
        });

        console.log(`✅ Generated: ${clientName} - ${format(startDateTime, 'yyyy-MM-dd HH:mm')} (${rule.recurrence_type})`);
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
          if (rule.day_of_month) {
            currentDate.setDate(rule.day_of_month);
          }
          break;
        default:
          return; // Salir si no es un tipo conocido
      }

      instanceCount++;
    }

    console.log(`🔄 Generated ${instances.filter(i => i.recurring_rule_id === rule.id).length} instances for rule ${rule.id}`);
  });

  console.log(`📊 Total recurring instances generated: ${instances.length}`);
  return instances;
};