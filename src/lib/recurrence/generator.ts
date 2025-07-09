/**
 * GENERADOR DE INSTANCIAS RECURRENTES
 * ===================================
 * 
 * Este archivo contiene la lógica central para generar instancias recurrentes
 */

import { format, addWeeks, startOfDay, endOfDay } from 'date-fns';
import { 
  RecurringRule, 
  RecurrenceInstance, 
  RecurrenceGenerationOptions,
  RecurrenceType 
} from './types';
import { 
  calculateNextOccurrence, 
  findFirstValidOccurrence, 
  normalizeRecurrence,
  debugRecurrence 
} from './utils';
import { DEFAULT_RECURRENCE_CONFIG } from './config';
import { buildAppointmentLocation } from '@/utils/appointmentLocationHelper';

/**
 * Genera instancias recurrentes para una regla específica
 */
export function generateRecurringInstances(
  rule: RecurringRule,
  options: RecurrenceGenerationOptions
): RecurrenceInstance[] {
  const {
    startDate,
    endDate,
    maxInstances = DEFAULT_RECURRENCE_CONFIG.maxInstancesPerRule,
    excludeConflicts = true,
    existingAppointments = []
  } = options;

  console.log(`🔄 Generating instances for rule ${rule.id} (${rule.recurrence_type})`);
  console.log(`  Range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
  console.log(`  Max instances: ${maxInstances}`);

  if (!rule.is_active) {
    console.log(`  ❌ Rule is inactive, skipping`);
    return [];
  }

  const recurrenceType = normalizeRecurrence(rule.recurrence_type);
  if (recurrenceType === 'none' || recurrenceType === 'once') {
    console.log(`  ❌ Not a recurring type (${recurrenceType}), skipping`);
    return [];
  }

  const instances: RecurrenceInstance[] = [];
  const ruleStartDate = new Date(rule.start_date);
  
  // Encontrar la primera ocurrencia válida
  let currentDate = findFirstValidOccurrence(
    startDate,
    recurrenceType,
    ruleStartDate,
    rule.day_of_week || undefined,
    rule.day_of_month || undefined
  );

  console.log(`  📅 First valid occurrence: ${format(currentDate, 'yyyy-MM-dd')}`);

  // Crear set de slots existentes para detección de conflictos
  const existingSlots = new Set(
    existingAppointments.map(apt => 
      `${apt.provider_id}-${apt.start_time}-${apt.end_time}`
    )
  );

  let instanceCount = 0;

  while (currentDate <= endDate && instanceCount < maxInstances) {
    // Crear las fechas de inicio y fin de esta instancia
    const instanceStart = new Date(currentDate);
    const [startHours, startMinutes] = rule.start_time.split(':').map(Number);
    instanceStart.setHours(startHours, startMinutes, 0, 0);

    const instanceEnd = new Date(currentDate);
    const [endHours, endMinutes] = rule.end_time.split(':').map(Number);
    instanceEnd.setHours(endHours, endMinutes, 0, 0);

    // Verificar si está dentro del rango solicitado
    if (instanceStart >= startDate && instanceStart <= endDate) {
      // Verificar conflictos si está habilitado
      const slotKey = `${rule.provider_id}-${instanceStart.toISOString()}-${instanceEnd.toISOString()}`;
      const hasConflict = excludeConflicts && existingSlots.has(slotKey);

      if (!hasConflict) {
        // Generar ID único para la instancia
        const instanceId = `recurring-${rule.id}-${format(instanceStart, 'yyyy-MM-dd-HH-mm')}`;

        // Construir ubicación completa
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

        // Crear la instancia
        const instance: RecurrenceInstance = {
          id: instanceId,
          recurring_rule_id: rule.id,
          instance_date: new Date(currentDate),
          start_time: instanceStart,
          end_time: instanceEnd,
          status: 'scheduled',
          notes: rule.notes || undefined,
          
          // Metadatos calculados
          is_recurring_instance: true,
          client_id: rule.client_id,
          provider_id: rule.provider_id,
          listing_id: rule.listing_id,
          service_title: rule.listings?.title || 'Servicio',
          client_name: rule.client_name || 'Cliente',
          complete_location: completeLocation
        };

        instances.push(instance);
        console.log(`  ✅ Generated: ${rule.client_name} - ${format(instanceStart, 'yyyy-MM-dd HH:mm')}`);
      } else {
        console.log(`  ⚠️  Conflict detected for ${format(instanceStart, 'yyyy-MM-dd HH:mm')}, skipping`);
      }
    }

    // Avanzar a la siguiente ocurrencia
    currentDate = calculateNextOccurrence(currentDate, recurrenceType);
    instanceCount++;
  }

  console.log(`  📊 Generated ${instances.length} instances for rule ${rule.id}`);
  return instances;
}

/**
 * Genera instancias para múltiples reglas de recurrencia
 */
export function generateMultipleRecurringInstances(
  rules: RecurringRule[],
  options: RecurrenceGenerationOptions
): RecurrenceInstance[] {
  console.log(`🔄 === GENERATING MULTIPLE RECURRING INSTANCES ===`);
  console.log(`Rules: ${rules.length}, Range: ${format(options.startDate, 'yyyy-MM-dd')} to ${format(options.endDate, 'yyyy-MM-dd')}`);

  const allInstances: RecurrenceInstance[] = [];

  rules.forEach(rule => {
    const ruleInstances = generateRecurringInstances(rule, options);
    allInstances.push(...ruleInstances);
  });

  // Ordenar por fecha de inicio
  allInstances.sort((a, b) => a.start_time.getTime() - b.start_time.getTime());

  console.log(`📊 Total instances generated: ${allInstances.length}`);
  return allInstances;
}

/**
 * Convierte instancias recurrentes a formato de cita para calendarios
 */
export function convertInstancesToAppointments(instances: RecurrenceInstance[]): any[] {
  return instances.map(instance => ({
    id: instance.id,
    provider_id: instance.provider_id,
    client_id: instance.client_id,
    listing_id: instance.listing_id,
    start_time: instance.start_time.toISOString(),
    end_time: instance.end_time.toISOString(),
    status: instance.status,
    recurrence: 'none', // Las instancias individuales no son recurrentes
    client_name: instance.client_name || 'Cliente',
    service_title: instance.service_title || 'Servicio',
    notes: instance.notes,
    is_recurring_instance: true,
    recurring_rule_id: instance.recurring_rule_id,
    complete_location: instance.complete_location || '',
    external_booking: false,
    listings: instance.service_title ? { 
      title: instance.service_title, 
      duration: 60 // Duración por defecto
    } : null
  }));
}

/**
 * Función auxiliar para generar instancias futuras de una cita existente
 */
export function generateFutureInstancesFromAppointment(
  originalAppointment: any,
  startDate: Date,
  endDate: Date,
  maxInstances: number = 50
): any[] {
  console.log('🔄 Generating future instances from appointment:', originalAppointment.id);
  
  if (!originalAppointment.recurrence || 
      originalAppointment.recurrence === 'none' || 
      originalAppointment.recurrence === 'once') {
    console.log('❌ Appointment is not recurring');
    return [];
  }

  const recurrenceType = normalizeRecurrence(originalAppointment.recurrence);
  const instances: any[] = [];
  
  let currentDate = new Date(originalAppointment.start_time);
  let instanceCount = 0;

  while (currentDate <= endDate && instanceCount < maxInstances) {
    // Avanzar a la siguiente ocurrencia
    currentDate = calculateNextOccurrence(currentDate, recurrenceType);
    
    if (currentDate > endDate) break;
    if (currentDate < startDate) continue;

    // Calcular duración original
    const originalStart = new Date(originalAppointment.start_time);
    const originalEnd = new Date(originalAppointment.end_time);
    const duration = originalEnd.getTime() - originalStart.getTime();

    // Crear nueva instancia
    const instanceStart = new Date(currentDate);
    const instanceEnd = new Date(instanceStart.getTime() + duration);

    const instanceId = `recurring-${originalAppointment.id}-${format(instanceStart, 'yyyy-MM-dd-HH-mm')}`;

    instances.push({
      id: instanceId,
      provider_id: originalAppointment.provider_id,
      client_id: originalAppointment.client_id,
      listing_id: originalAppointment.listing_id,
      start_time: instanceStart.toISOString(),
      end_time: instanceEnd.toISOString(),
      status: 'confirmed',
      recurrence: originalAppointment.recurrence,
      client_name: originalAppointment.client_name || 'Cliente',
      service_title: originalAppointment.service_title || 'Servicio',
      notes: originalAppointment.notes,
      is_recurring_instance: true,
      recurring_rule_id: originalAppointment.recurring_rule_id,
      complete_location: originalAppointment.complete_location || '',
      external_booking: originalAppointment.external_booking || false
    });

    instanceCount++;
  }

  console.log(`📊 Generated ${instances.length} future instances`);
  return instances;
}

/**
 * Función de debug para visualizar la generación
 */
export function debugRecurrenceGeneration(
  rule: RecurringRule,
  instances: RecurrenceInstance[]
): void {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🔍 === RECURRENCE GENERATION DEBUG ===');
  console.log(`Rule ID: ${rule.id}`);
  console.log(`Type: ${rule.recurrence_type}`);
  console.log(`Client: ${rule.client_name}`);
  console.log(`Start Date: ${rule.start_date}`);
  console.log(`Time: ${rule.start_time} - ${rule.end_time}`);
  console.log(`Day of Week: ${rule.day_of_week}`);
  console.log(`Day of Month: ${rule.day_of_month}`);
  console.log(`Active: ${rule.is_active}`);
  console.log(`Generated Instances: ${instances.length}`);
  
  if (instances.length > 0) {
    console.log('First 5 instances:');
    instances.slice(0, 5).forEach((instance, i) => {
      console.log(`  ${i + 1}. ${format(instance.start_time, 'yyyy-MM-dd HH:mm')} - ${instance.client_name}`);
    });
  }
  
  console.log('=====================================');
}