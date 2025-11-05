import { useMemo } from 'react';
import { useClientBookings } from './useClientBookings';
import { useAuth } from '@/contexts/AuthContext';

export function useClientAppointmentsCount() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useClientBookings();

  const count = useMemo(() => {
    if (!bookings || !user || user.role !== 'client') return 0;
    
    const now = new Date();
    const validRecurrences = new Set(['daily','weekly','biweekly','triweekly','monthly']);
    
    // Separar citas futuras activas
    const futureActiveBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const isFuture = bookingDate >= now;
      const isActive = ['pending', 'confirmed'].includes(booking.status);
      return isFuture && isActive;
    });
    
    // Separar citas recurrentes de únicas
    const recurring = futureActiveBookings.filter(b => validRecurrences.has(b.recurrence));
    const nonRecurring = futureActiveBookings.filter(b => 
      !validRecurrences.has(b.recurrence) || b.recurrence === 'once' || b.recurrence === 'none'
    );
    
    // Agrupar citas recurrentes por plan (listing_id + provider_id + recurrence + hora)
    const recurringGroups = new Map<string, any[]>();
    
    recurring.forEach(booking => {
      const bookingDate = new Date(booking.date);
      const hour = bookingDate.getHours();
      const minute = bookingDate.getMinutes();
      const groupKey = `${booking.listingId}-${booking.providerId}-${booking.recurrence}-${hour}:${minute}`;
      
      if (!recurringGroups.has(groupKey)) {
        recurringGroups.set(groupKey, []);
      }
      recurringGroups.get(groupKey)!.push(booking);
    });
    
    // Contar solo el próximo de cada plan recurrente (cada grupo = 1)
    const uniqueRecurringPlans = recurringGroups.size;
    
    // Retornar: planes recurrentes únicos + citas únicas
    return uniqueRecurringPlans + nonRecurring.length;
  }, [bookings, user]);

  return { 
    count,
    isLoading 
  };
}
