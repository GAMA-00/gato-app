import { useMemo } from 'react';
import { useClientBookings } from './useClientBookings';
import { useAuth } from '@/contexts/AuthContext';
import { addDays } from 'date-fns';

export function useClientAppointmentsCount() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useClientBookings();

  const count = useMemo(() => {
    if (!bookings || !user || user.role !== 'client') return 0;
    
    const now = new Date();
    const validRecurrences = new Set(['weekly','biweekly','triweekly','monthly']);
    
    console.log('=== CALCULATING APPOINTMENTS COUNT (UNIFIED SYSTEM) ===');
    console.log(`Total bookings: ${bookings.length}`);
    
    // Separar citas futuras activas (usando el sistema unificado que ya incluye instancias virtuales)
    const futureActiveBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const isFuture = bookingDate >= now;
      const isActive = ['pending', 'confirmed'].includes(booking.status);
      return isFuture && isActive;
    });
    
    console.log(`Future active bookings: ${futureActiveBookings.length}`);
    
    // Separar citas recurrentes de únicas
    const recurring = futureActiveBookings.filter(b => validRecurrences.has(b.recurrence));
    const nonRecurring = futureActiveBookings.filter(b => 
      !validRecurrences.has(b.recurrence) || b.recurrence === 'once' || b.recurrence === 'none'
    );
    
    console.log(`Recurring: ${recurring.length}, Non-recurring: ${nonRecurring.length}`);
    
    // Agrupar citas recurrentes por plan único
    // Ahora usamos el sistema unificado que ya calculó las instancias virtuales
    // Solo mostramos la siguiente cita de cada plan
    const recurringGroups = new Map<string, any[]>();
    
    recurring.forEach(booking => {
      const bookingDate = new Date(booking.date);
      const hour = bookingDate.getHours();
      const minute = bookingDate.getMinutes();
      // Group by: listing + provider + recurrence pattern + time
      const groupKey = `${booking.listingId}-${booking.providerId}-${booking.recurrence}-${hour}:${minute}`;
      
      if (!recurringGroups.has(groupKey)) {
        recurringGroups.set(groupKey, []);
      }
      recurringGroups.get(groupKey)!.push(booking);
    });
    
    // Para cada grupo recurrente, solo contamos 1 (la próxima cita)
    const uniqueRecurringPlans = recurringGroups.size;
    
    console.log(`Unique recurring plans: ${uniqueRecurringPlans}`);
    console.log(`Final count: ${uniqueRecurringPlans + nonRecurring.length}`);
    
    // Retornar: planes recurrentes únicos + citas únicas
    return uniqueRecurringPlans + nonRecurring.length;
  }, [bookings, user]);

  return { 
    count,
    isLoading 
  };
}
