/**
 * UTILIDADES PARA RECURRENCIA MENSUAL BASADA EN PATRÓN SEMANAL
 * =============================================================
 * 
 * Implementa lógica correcta para recurrencia mensual donde:
 * - Se respeta el patrón de semana del mes (primera, segunda, tercera, cuarta)
 * - Se mantiene el mismo día de la semana
 * 
 * Ejemplo: "primer viernes de julio" → "primer viernes de agosto"
 */

import { addMonths, startOfMonth, format, addDays } from 'date-fns';

/**
 * Calcula el patrón de semana para una fecha específica
 * @param date - Fecha para analizar
 * @returns Objeto con información del patrón semanal
 */
export function getWeekPattern(date: Date) {
  const dayOfWeek = date.getDay(); // 0 = domingo, 1 = lunes, etc.
  const dayOfMonth = date.getDate();
  
  // Calcular en qué semana del mes está (1-4, ocasionalmente 5)
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  
  // Calcular la ocurrencia específica del día en el mes
  // (ej: es el primer, segundo, tercer viernes del mes)
  const firstOfMonth = startOfMonth(date);
  const firstDayOfWeek = firstOfMonth.getDay();
  
  // Días hasta el primer día de la semana objetivo
  const daysToFirstOccurrence = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const firstOccurrenceDate = daysToFirstOccurrence + 1;
  
  // Calcular qué ocurrencia es esta fecha
  const occurrenceNumber = Math.floor((dayOfMonth - firstOccurrenceDate) / 7) + 1;
  
  return {
    dayOfWeek,
    weekOfMonth,
    occurrenceNumber, // 1 = primer lunes, 2 = segundo lunes, etc.
    dayName: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek],
    description: `${getOccurrenceText(occurrenceNumber)} ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dayOfWeek]} del mes`
  };
}

/**
 * Calcula la próxima ocurrencia mensual basada en el patrón semanal
 * @param originalDate - Fecha original de la cita
 * @param currentDate - Fecha actual (para calcular desde cuándo)
 * @returns Próxima fecha que cumple el patrón
 */
export function calculateMonthlyByWeekPattern(originalDate: Date, currentDate: Date = new Date()): Date {
  const pattern = getWeekPattern(originalDate);
  
  console.log(`📅 Calculando recurrencia mensual por patrón:`);
  console.log(`   Original: ${format(originalDate, 'dd/MM/yyyy (EEEE)')} - ${pattern.description}`);
  
  // Empezar desde el mes actual o siguiente
  let targetMonth = new Date(currentDate);
  targetMonth.setDate(1); // Primer día del mes
  targetMonth.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
  
  // Si ya pasó la fecha de este mes, empezar desde el siguiente
  const thisMonthOccurrence = findNthOccurrenceInMonth(targetMonth, pattern.dayOfWeek, pattern.occurrenceNumber);
  if (thisMonthOccurrence <= currentDate) {
    targetMonth = addMonths(targetMonth, 1);
  }
  
  // Buscar la fecha correcta en el mes objetivo
  let attempts = 0;
  const maxAttempts = 12; // Máximo 12 meses hacia adelante
  
  while (attempts < maxAttempts) {
    const nextOccurrence = findNthOccurrenceInMonth(targetMonth, pattern.dayOfWeek, pattern.occurrenceNumber);
    
    if (nextOccurrence && nextOccurrence > currentDate) {
      console.log(`✅ Próxima ocurrencia: ${format(nextOccurrence, 'dd/MM/yyyy (EEEE)')} - ${pattern.description}`);
      return nextOccurrence;
    }
    
    // Si no existe esa ocurrencia en este mes (ej: no hay 5to lunes), probar el siguiente
    targetMonth = addMonths(targetMonth, 1);
    attempts++;
  }
  
  // Fallback: si no encuentra ninguna ocurrencia válida, usar el día específico del mes siguiente
  console.warn(`⚠️ No se pudo encontrar patrón semanal, usando fallback al día ${originalDate.getDate()}`);
  const fallback = addMonths(currentDate, 1);
  fallback.setDate(originalDate.getDate());
  fallback.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
  return fallback;
}

/**
 * Encuentra la n-ésima ocurrencia de un día de la semana en un mes específico
 * @param monthDate - Cualquier fecha del mes objetivo
 * @param dayOfWeek - Día de la semana (0=domingo, 1=lunes, etc.)
 * @param occurrence - Qué ocurrencia buscar (1=primera, 2=segunda, etc.)
 * @returns Fecha de la ocurrencia, o null si no existe
 */
export function findNthOccurrenceInMonth(monthDate: Date, dayOfWeek: number, occurrence: number): Date | null {
  const firstOfMonth = startOfMonth(monthDate);
  const firstDayOfWeek = firstOfMonth.getDay();
  
  // Calcular días hasta el primer día de la semana objetivo
  const daysToFirstOccurrence = (dayOfWeek - firstDayOfWeek + 7) % 7;
  const firstOccurrenceDate = daysToFirstOccurrence + 1;
  
  // Calcular la fecha de la n-ésima ocurrencia
  const targetDate = firstOccurrenceDate + (occurrence - 1) * 7;
  
  // Verificar que la fecha esté dentro del mes
  const resultDate = new Date(firstOfMonth);
  resultDate.setDate(targetDate);
  resultDate.setHours(monthDate.getHours(), monthDate.getMinutes(), 0, 0);
  
  // Si la fecha resultante está en el siguiente mes, no existe esa ocurrencia
  if (resultDate.getMonth() !== firstOfMonth.getMonth()) {
    return null;
  }
  
  return resultDate;
}

/**
 * Convierte número de ocurrencia a texto descriptivo
 */
function getOccurrenceText(occurrence: number): string {
  const texts = ['', 'primer', 'segundo', 'tercer', 'cuarto', 'quinto'];
  return texts[occurrence] || `${occurrence}º`;
}

/**
 * Valida si una fecha cumple con el patrón mensual especificado
 * @param date - Fecha a validar
 * @param originalPattern - Patrón original obtenido con getWeekPattern
 * @returns true si la fecha cumple el patrón
 */
export function validateMonthlyPattern(date: Date, originalPattern: ReturnType<typeof getWeekPattern>): boolean {
  const datePattern = getWeekPattern(date);
  
  return (
    datePattern.dayOfWeek === originalPattern.dayOfWeek &&
    datePattern.occurrenceNumber === originalPattern.occurrenceNumber
  );
}

/**
 * Genera una descripción legible del patrón de recurrencia mensual
 * @param originalDate - Fecha original
 * @returns Descripción del patrón (ej: "Cada primer viernes del mes")
 */
export function getMonthlyPatternDescription(originalDate: Date): string {
  const pattern = getWeekPattern(originalDate);
  return `Cada ${pattern.description}`;
}