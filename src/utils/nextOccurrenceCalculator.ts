/**
 * Utility for calculating the next occurrence date for recurring appointments
 */

import { calculateMonthlyByWeekPattern } from './monthlyRecurrenceUtils';

export function calculateNextOccurrence(
  appointmentStartTime: string,
  recurrence: string
): Date {
  const appointmentTime = new Date(appointmentStartTime);
  const now = new Date();
  
  console.log(`📅 Calculando próxima ocurrencia para cita recurrente: ${recurrence}`);
  
  // Para citas no recurrentes o 'once', usar la fecha original
  if (!recurrence || recurrence === 'none' || recurrence === 'once' || recurrence === '') {
    console.log(`📅 Cita única, usando fecha original: ${appointmentTime.toLocaleString()}`);
    return appointmentTime;
  }
  
  switch (recurrence) {
    case 'weekly':
      return calculateWeeklyOccurrence(appointmentTime, now);
    
    case 'biweekly':
      return calculateBiweeklyOccurrence(appointmentTime, now);
    
    case 'monthly':
      return calculateMonthlyOccurrence(appointmentTime, now);
    
    default:
      console.log(`⚠️ Tipo de recurrencia desconocido: ${recurrence}, usando fecha original`);
      return appointmentTime;
  }
}

function calculateWeeklyOccurrence(appointmentTime: Date, now: Date): Date {
  const dayOfWeek = appointmentTime.getDay(); // 0 = domingo, 1 = lunes, etc.
  let nextDate = new Date(now);
  nextDate.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
  
  // Encontrar el próximo día de la semana
  const daysUntilNext = (dayOfWeek - nextDate.getDay() + 7) % 7;
  if (daysUntilNext === 0 && nextDate <= now) {
    // Si es hoy pero ya pasó la hora, programar para la próxima semana
    nextDate.setDate(nextDate.getDate() + 7);
  } else {
    nextDate.setDate(nextDate.getDate() + daysUntilNext);
  }
  
  console.log(`⏰ Próxima ocurrencia semanal: ${nextDate.toLocaleString()}`);
  return nextDate;
}

function calculateBiweeklyOccurrence(appointmentTime: Date, now: Date): Date {
  const dayOfWeek = appointmentTime.getDay();
  let nextDate = new Date(now);
  nextDate.setHours(appointmentTime.getHours(), appointmentTime.getMinutes(), 0, 0);
  
  // Encontrar la próxima fecha que coincida con el patrón quincenal
  const daysUntilNext = (dayOfWeek - nextDate.getDay() + 7) % 7;
  nextDate.setDate(nextDate.getDate() + daysUntilNext);
  
  // Verificar si cae en la semana correcta del patrón quincenal
  const diffWeeks = Math.floor((nextDate.getTime() - appointmentTime.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (diffWeeks % 2 !== 0) {
    nextDate.setDate(nextDate.getDate() + 7);
  }
  
  if (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + 14);
  }
  
  console.log(`⏰ Próxima ocurrencia quincenal: ${nextDate.toLocaleString()}`);
  return nextDate;
}

function calculateMonthlyOccurrence(appointmentTime: Date, now: Date): Date {
  // Usar la nueva lógica basada en patrón semanal
  const nextDate = calculateMonthlyByWeekPattern(appointmentTime, now);
  
  console.log(`⏰ Próxima ocurrencia mensual (patrón semanal): ${nextDate.toLocaleString()}`);
  return nextDate;
}