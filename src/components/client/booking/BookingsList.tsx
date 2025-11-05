
import React from 'react';
import { ClientBooking } from '@/hooks/useClientBookings';
import { BookingCard } from '@/components/client/booking/BookingCard';
import { BookingSkeleton } from '@/components/client/booking/BookingSkeleton';
import { RecurringAppointmentAdvancer } from '@/components/client/booking/RecurringAppointmentAdvancer';
import { useDailyRecurrenceGenerator } from '@/hooks/useDailyRecurrenceGenerator';

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 lg:gap-3 xl:gap-4">
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-4 lg:gap-3 xl:gap-4">
      {bookings.map(booking => (
        <div key={booking.id}>
          <BookingCard booking={booking} onRated={onRated} />
          {/* Auto-advance recurring appointments when completed */}
          {['daily','weekly','biweekly','triweekly','monthly'].includes(booking.recurrence || 'none') && (
            <RecurringAppointmentAdvancer
              appointmentId={booking.id}
              isCompleted={booking.status === 'completed'}
              recurrence={booking.recurrence}
              onAdvanced={onRated}
            />
          )}
          {/* Proactively generate next instance for daily appointments */}
          {booking.recurrence === 'daily' && ['confirmed', 'pending'].includes(booking.status) && (
            <DailyInstanceGenerator
              appointmentId={booking.id}
              recurrence={booking.recurrence}
              status={booking.status}
              startTime={booking.date.toISOString()}
            />
          )}
        </div>
      ))}
    </div>
  );
};

// Component wrapper for the daily generator hook
const DailyInstanceGenerator = ({ appointmentId, recurrence, status, startTime }: any) => {
  useDailyRecurrenceGenerator({ appointmentId, recurrence, status, startTime });
  return null;
};
