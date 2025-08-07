
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceVariant } from '@/components/client/service/types';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { RobustBookingButton } from './RobustBookingButton';

interface BookingSummaryCardProps {
  serviceTitle: string;
  providerName?: string;
  selectedVariant?: ServiceVariant;
  selectedVariants?: ServiceVariantWithQuantity[];
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
  // New props for robust booking
  bookingData?: {
    listingId: string;
    startTime: string;
    endTime: string;
    recurrenceType: string;
    notes?: string;
    clientAddress?: string;
    clientPhone?: string;
    clientEmail?: string;
    customVariableSelections?: any;
    customVariablesTotalPrice?: number;
  };
  onBookingSuccess?: (appointment: any) => void;
}

const BookingSummaryCard = ({
  serviceTitle,
  providerName,
  selectedVariant,
  selectedVariants = [],
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
  customVariablesTotalPrice = 0,
  bookingData,
  onBookingSuccess
}: BookingSummaryCardProps) => {
  // Calculate totals for multiple variants
  const totalPrice = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + (Number(variant.price) * variant.quantity), 0) + customVariablesTotalPrice
    : (selectedVariant ? Number(selectedVariant.price) + customVariablesTotalPrice : 0);
  
  const totalDuration = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + (Number(variant.duration) * variant.quantity), 0)
    : (selectedVariant ? Number(selectedVariant.duration) : 0);
  
  const totalServices = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
    : (selectedVariant ? 1 : 0);
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

        {(selectedVariants.length > 0 || selectedVariant) && (
          <div>
            {selectedVariants.length > 0 ? (
              // Multiple variants display
              <div className="space-y-3">
                {selectedVariants.map((variant, index) => (
                  <div key={variant.id || index} className="pb-2 border-b last:border-b-0">
                    <p className="font-medium">
                      {variant.name} {variant.quantity > 1 && <span className="text-muted-foreground">x{variant.quantity}</span>}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span>Duración:</span>
                      <span>{variant.duration * variant.quantity} min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span className="font-medium">${formatPrice(Number(variant.price) * variant.quantity)}</span>
                    </div>
                    {variant.quantity > 1 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Precio unitario:</span>
                        <span>${formatPrice(Number(variant.price))} c/u</span>
                      </div>
                    )}
                  </div>
                ))}
                {customVariablesTotalPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Variables adicionales:</span>
                    <span className="font-medium">+${formatPrice(customVariablesTotalPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                  <span>Total ({totalServices} servicio{totalServices !== 1 ? 's' : ''}):</span>
                  <span>${formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Duración total:</span>
                  <span>{totalDuration} min</span>
                </div>
              </div>
            ) : (
              // Single variant display
              <div>
                <p className="font-medium">{selectedVariant?.name}</p>
                <div className="flex justify-between text-sm">
                  <span>Duración:</span>
                  <span>{selectedVariant?.duration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Precio base:</span>
                  <span className="font-medium">${formatPrice(selectedVariant?.price || 0)}</span>
                </div>
                {customVariablesTotalPrice > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Variables adicionales:</span>
                    <span className="font-medium">+${formatPrice(customVariablesTotalPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span>${formatPrice(totalPrice)}</span>
                </div>
              </div>
            )}
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

        {/* ROBUST Booking Button with Enhanced Error Handling */}
        {bookingData ? (
          <RobustBookingButton
            bookingData={bookingData}
            onSuccess={onBookingSuccess}
            disabled={!selectedDate || !selectedTime || (!selectedVariant && selectedVariants.length === 0)}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
          />
        ) : (
          <Button
            onClick={onBooking}
            disabled={isLoading || !selectedDate || !selectedTime || (!selectedVariant && selectedVariants.length === 0)}
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
        )}

        {/* ENHANCED validation feedback with better UX */}
        {(!selectedDate || !selectedTime || (!selectedVariant && selectedVariants.length === 0)) && !isLoading && (
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <div className="bg-muted/50 p-2 rounded-md">
              <p className="font-medium">Para continuar:</p>
              <ul className="text-xs mt-1 space-y-0.5">
                {!selectedDate && <li>• Selecciona una fecha</li>}
                {!selectedTime && <li>• Selecciona una hora</li>}
                {(!selectedVariant && selectedVariants.length === 0) && <li>• Selecciona un servicio</li>}
              </ul>
            </div>
          </div>
        )}
        
        {/* SUCCESS feedback when all requirements are met */}
        {selectedDate && selectedTime && (selectedVariant || selectedVariants.length > 0) && !isLoading && (
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
