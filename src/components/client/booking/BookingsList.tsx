
import React from 'react';
import { ClientBooking } from '@/hooks/useClientBookings';
import { BookingCard } from '@/components/client/booking/BookingCard';
import { BookingSkeleton } from '@/components/client/booking/BookingSkeleton';

interface BookingsListProps {
  bookings: ClientBooking[];
  isLoading: boolean;
  onRated: () => void;
  title?: string;
  emptyMessage: string;
}

export const BookingsList = ({ 
  bookings, 
  isLoading, 
  onRated, 
  title, 
  emptyMessage 
}: BookingsListProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
        <BookingSkeleton />
        <BookingSkeleton />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
      {bookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} onRated={onRated} />
      ))}
    </div>
  );
};
