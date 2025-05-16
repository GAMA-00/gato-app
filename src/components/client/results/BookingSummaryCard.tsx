
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock } from 'lucide-react';
import { BookingPreferences } from './types';

interface BookingSummaryCardProps {
  bookingPrefs: BookingPreferences;
}

const BookingSummaryCard = ({ bookingPrefs }: BookingSummaryCardProps) => {
  return (
    <Card className="mb-6 bg-app-cardAlt border-app-border">
      <CardContent className="p-4">
        <h3 className="font-medium mb-2 text-app-text">Tu reserva</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          {bookingPrefs.frequency && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-app-text" />
              <span className="text-app-text/80">
                {bookingPrefs.frequency === 'once' ? 'Una vez' : 
                 bookingPrefs.frequency === 'weekly' ? 'Semanal' : 
                 bookingPrefs.frequency === 'biweekly' ? 'Quincenal' : 
                 'Personalizada'}
              </span>
            </div>
          )}
          
          {bookingPrefs.selectedDays?.length > 0 && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-app-text" />
              <span className="text-app-text/80">
                {bookingPrefs.selectedDays.map((day: number) => 
                  ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][day]
                ).join(', ')}
              </span>
            </div>
          )}
          
          {bookingPrefs.timeSlot && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-app-text" />
              <span className="text-app-text/80">
                {bookingPrefs.timePreference === 'flexible' 
                  ? `Entre ${bookingPrefs.timeSlot}h` 
                  : `A las ${bookingPrefs.timeSlot}`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingSummaryCard;
