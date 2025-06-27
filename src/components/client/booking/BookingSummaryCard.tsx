
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceVariant } from '@/components/client/service/types';

interface BookingSummaryCardProps {
  serviceTitle: string;
  providerName?: string;
  selectedVariant: ServiceVariant | undefined;
  selectedDate: Date | undefined;
  selectedTime: string;
  clientLocation: string;
  isLoadingLocation: boolean;
  isBookingValid: boolean;
  isLoading: boolean;
  onBooking: () => void;
  formatPrice: (price: number | string) => string;
  getRecurrenceText: (frequency: string) => string;
  selectedFrequency: string;
}

const BookingSummaryCard = ({
  serviceTitle,
  providerName,
  selectedVariant,
  selectedDate,
  selectedTime,
  clientLocation,
  isLoadingLocation,
  isBookingValid,
  isLoading,
  onBooking,
  formatPrice,
  getRecurrenceText,
  selectedFrequency
}: BookingSummaryCardProps) => {
  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle>Resumen de Reserva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-medium">{serviceTitle}</p>
          <p className="text-sm text-muted-foreground">
            {providerName}
          </p>
        </div>

        {selectedVariant && (
          <div>
            <p className="font-medium">{selectedVariant.name}</p>
            <div className="flex justify-between text-sm">
              <span>Duración:</span>
              <span>{selectedVariant.duration} min</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Precio:</span>
              <span className="font-medium">${formatPrice(selectedVariant.price)}</span>
            </div>
          </div>
        )}

        {selectedDate && selectedTime && (
          <div>
            <p className="font-medium text-sm mb-1">Fecha y hora:</p>
            <p className="text-sm">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
            <p className="text-sm">
              {selectedTime} ({getRecurrenceText(selectedFrequency)})
            </p>
          </div>
        )}

        <div>
          <p className="font-medium text-sm mb-1">Ubicación:</p>
          <p className="text-sm">
            {isLoadingLocation ? 'Cargando ubicación...' : clientLocation}
          </p>
        </div>

        {/* 6. Booking Button */}
        <Button
          onClick={onBooking}
          disabled={!isBookingValid || isLoading}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {isLoading ? 'Creando reserva...' : 'Confirmar Reserva'}
        </Button>

        {!isBookingValid && (
          <p className="text-sm text-muted-foreground text-center">
            Completa todos los campos para continuar
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingSummaryCard;
