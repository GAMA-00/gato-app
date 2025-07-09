
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
  customVariablesTotalPrice?: number;
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
  selectedFrequency,
  customVariablesTotalPrice = 0
}: BookingSummaryCardProps) => {
  return (
    <Card className="w-full">{/* Removed sticky positioning */}
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
              <span>Precio base:</span>
              <span className="font-medium">${formatPrice(selectedVariant.price)}</span>
            </div>
            {customVariablesTotalPrice > 0 && (
              <div className="flex justify-between text-sm">
                <span>Variables adicionales:</span>
                <span className="font-medium">+${formatPrice(customVariablesTotalPrice)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
              <span>Total:</span>
              <span>${formatPrice((typeof selectedVariant.price === 'string' ? parseFloat(selectedVariant.price) : selectedVariant.price) + customVariablesTotalPrice)}</span>
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

        {/* OPTIMIZED Booking Button with Enhanced Feedback */}
        <Button
          onClick={onBooking}
          disabled={isLoading || !selectedDate || !selectedTime || !selectedVariant}
          className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span className="animate-pulse">Procesando reserva...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>Confirmar Reserva</span>
              <span className="text-xs opacity-80">✓</span>
            </div>
          )}
        </Button>

        {/* ENHANCED validation feedback with better UX */}
        {(!selectedDate || !selectedTime || !selectedVariant) && !isLoading && (
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <div className="bg-muted/50 p-2 rounded-md">
              <p className="font-medium">Para continuar:</p>
              <ul className="text-xs mt-1 space-y-0.5">
                {!selectedDate && <li>• Selecciona una fecha</li>}
                {!selectedTime && <li>• Selecciona una hora</li>}
                {!selectedVariant && <li>• Selecciona un servicio</li>}
              </ul>
            </div>
          </div>
        )}
        
        {/* SUCCESS feedback when all requirements are met */}
        {selectedDate && selectedTime && selectedVariant && !isLoading && (
          <div className="text-sm text-green-600 text-center flex items-center justify-center gap-1">
            <span className="text-green-600">✓</span>
            <span>Listo para confirmar tu reserva</span>
          </div>
        )}

        {/* User data loading indicator - Non-blocking */}
        {isLoadingLocation && (
          <div className="text-xs text-blue-600 text-center flex items-center justify-center gap-1">
            <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Cargando datos del usuario...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingSummaryCard;
