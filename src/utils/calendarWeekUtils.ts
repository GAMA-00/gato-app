import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula el rango exacto de una semana calendario (lunes a domingo)
 * @param weekIndex 0 = semana actual, 1 = próxima semana, etc.
 * @returns { startDate, endDate } fechas exactas de inicio y fin de la semana
 */
export const getCalendarWeekRange = (weekIndex: number): { startDate: Date, endDate: Date } => {
  const today = new Date();
  
  // Calcular el lunes de la semana actual
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // 1 = Monday
  
  // Añadir las semanas correspondientes
  const targetWeekStart = addWeeks(currentWeekStart, weekIndex);
  const targetWeekEnd = endOfWeek(targetWeekStart, { weekStartsOn: 1 });
  
  return {
    startDate: targetWeekStart,
    endDate: targetWeekEnd
  };
};

/**
 * Genera la etiqueta para mostrar en la interfaz de una semana
 * @param weekIndex índice de la semana
 * @returns string con el formato "4-10 ago" o "Esta semana"
 */
export const getCalendarWeekLabel = (weekIndex: number): string => {
  if (weekIndex === 0) {
    return 'Esta semana';
  }
  
  const { startDate, endDate } = getCalendarWeekRange(weekIndex);
  
  const startDay = format(startDate, 'd');
  const endDay = format(endDate, 'd');
  const month = format(endDate, 'MMM', { locale: es });
  
  // Si están en el mismo mes
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${startDay}-${endDay} ${month}`;
  }
  
  // Si están en meses diferentes
  const startMonth = format(startDate, 'MMM', { locale: es });
  return `${startDay} ${startMonth} - ${endDay} ${month}`;
};

/**
 * Verifica si una fecha está dentro de la semana actual
 * @param date fecha a verificar
 * @returns true si la fecha está en la semana actual
 */
export const isInCurrentWeek = (date: Date): boolean => {
  const { startDate, endDate } = getCalendarWeekRange(0);
  return date >= startDate && date <= endDate;
};

/**
 * Obtiene el índice de semana para una fecha específica
 * @param date fecha a verificar
 * @returns número de semana (0 = actual, 1 = próxima, etc.)
 */
export const getWeekIndexForDate = (date: Date): number => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const targetWeekStart = startOfWeek(date, { weekStartsOn: 1 });
  
  const diffInMs = targetWeekStart.getTime() - currentWeekStart.getTime();
  const diffInWeeks = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
  
  return Math.max(0, diffInWeeks);
};