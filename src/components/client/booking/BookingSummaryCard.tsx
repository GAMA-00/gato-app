
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ServiceVariant } from '@/components/client/service/types';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { RobustBookingButton } from './RobustBookingButton';
import ServiceInfo from '@/components/client/service/PostPaymentInfo';

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
  // New props for slot validation
  selectedSlotIds?: string[];
  requiredSlots?: number;
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
  hasPostPaymentCosts?: boolean;
  isPostPayment?: boolean;
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
  selectedSlotIds = [],
  requiredSlots = 1,
  bookingData,
  onBookingSuccess,
  hasPostPaymentCosts = false,
  isPostPayment = false
}: BookingSummaryCardProps) => {
  // Calculate totals for multiple variants (including per-person pricing if present)
  const totalPrice = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => {
        const base = Number(variant.price) * variant.quantity;
        const persons = variant.personQuantity && variant.additionalPersonPrice
          ? Number(variant.additionalPersonPrice) * variant.personQuantity * variant.quantity
          : 0;
        return sum + base + persons;
      }, 0) + customVariablesTotalPrice
    : (selectedVariant ? Number(selectedVariant.price) + customVariablesTotalPrice : 0);
  
  const totalDuration = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + (Number(variant.duration) * variant.quantity), 0)
    : (selectedVariant ? Number(selectedVariant.duration) : 0);
  
  const totalServices = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
    : (selectedVariant ? 1 : 0);

  // Simplified validation - only check essential booking requirements
  const isEssentialDataValid = selectedDate && selectedTime && (selectedVariant || selectedVariants.length > 0);
  
  return (
    <Card className="w-full">{/* Removed sticky positioning */}
      <CardHeader>
        <CardTitle>Resumen de Reserva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Information organized in 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Service and Provider */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Servicio</p>
              <p className="font-medium">{serviceTitle}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Proveedor</p>
              <p className="text-sm">{providerName}</p>
            </div>
          </div>

          {/* Column 2: Date, Time and Duration */}
          <div className="space-y-3">
            {selectedDate && selectedTime && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Fecha y hora</p>
                <p className="text-sm">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-sm">
                  {selectedTime} ({getRecurrenceText(selectedFrequency)})
                </p>
              </div>
            )}

            {(selectedVariants.length > 0 || selectedVariant) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Duración</p>
                <p className="text-sm">{totalDuration} min</p>
              </div>
            )}
          </div>

          {/* Column 3: Location and Specific Service */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Ubicación</p>
              <p className="text-sm">
                {isLoadingLocation ? 'Cargando ubicación...' : clientLocation}
              </p>
            </div>

            {/* Specific service name */}
            {selectedVariants.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Servicios contratados</p>
                <div className="space-y-1">
                  {selectedVariants.map((variant, index) => (
                    <p key={variant.id || index} className="text-sm">
                      {variant.name} {variant.quantity > 1 && <span className="text-muted-foreground">x{variant.quantity}</span>}
                    </p>
                  ))}
                </div>
              </div>
            ) : selectedVariant && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Servicio específico</p>
                <p className="text-sm">{selectedVariant.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Service Information - For both prepago and postpago */}
        <ServiceInfo isPostPayment={isPostPayment} />

        {/* ROBUST Booking Button with Simplified Validation */}
        {bookingData ? (
          <RobustBookingButton
            bookingData={bookingData}
            onSuccess={onBookingSuccess}
            disabled={!isEssentialDataValid}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl"
          />
        ) : (
          <Button
            onClick={onBooking}
            disabled={isLoading || !isEssentialDataValid}
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
                <span>Continuar al Pago</span>
                <span className="text-xs opacity-80">→</span>
              </div>
            )}
          </Button>
        )}

        {/* Simplified validation feedback */}
        {!isEssentialDataValid && !isLoading && (
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <div className="bg-muted/50 p-2 rounded-md">
              <p className="font-medium">Para continuar:</p>
              <ul className="text-xs mt-1 space-y-0.5">
                {!selectedDate && <li>• Selecciona una fecha</li>}
                {!selectedTime && <li>• Selecciona una hora de inicio</li>}
                {(!selectedVariant && selectedVariants.length === 0) && <li>• Selecciona un servicio</li>}
              </ul>
            </div>
          </div>
        )}
        
        {/* SUCCESS feedback when all requirements are met */}
        {isEssentialDataValid && !isLoading && (
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
