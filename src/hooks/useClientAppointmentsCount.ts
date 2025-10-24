import { useMemo } from 'react';
import { useClientBookings } from './useClientBookings';
import { useAuth } from '@/contexts/AuthContext';

export function useClientAppointmentsCount() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useClientBookings();

  const count = useMemo(() => {
    if (!bookings || !user || user.role !== 'client') return 0;
    
    const now = new Date();
    
    const activeBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      const isFuture = bookingDate >= now;
      const isActive = ['pending', 'confirmed'].includes(booking.status);
      return isFuture && isActive;
    });
    
    return activeBookings.length;
  }, [bookings, user]);

  return { 
    count,
    isLoading 
  };
}
