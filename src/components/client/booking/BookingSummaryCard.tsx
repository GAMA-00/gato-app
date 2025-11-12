
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { ServiceVariant } from '@/components/client/service/types';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { RobustBookingButton } from './RobustBookingButton';
import { Info } from 'lucide-react';

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
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-base font-semibold">Resumen de Reserva</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        {/* Compact Information Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Column 1 */}
          <div className="space-y-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Servicio</p>
              <p className="text-sm font-medium">{serviceTitle}</p>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Proveedor</p>
              <p className="text-xs">{providerName}</p>
            </div>

            {(selectedVariants.length > 0 || selectedVariant) && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Duración</p>
                <p className="text-xs">{totalDuration} min</p>
              </div>
            )}
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            {selectedDate && selectedTime && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">Fecha y hora</p>
                <p className="text-xs">
                  {formatDateES(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-xs">
                  {selectedTime} ({getRecurrenceText(selectedFrequency)})
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Ubicación</p>
              <p className="text-xs">
                {isLoadingLocation ? 'Cargando...' : clientLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Services List - Full Width */}
        {selectedVariants.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Servicios contratados</p>
            <div className="space-y-0.5">
              {selectedVariants.map((variant, index) => (
                <p key={variant.id || index} className="text-xs">
                  {variant.name} {variant.quantity > 1 && <span className="text-muted-foreground">x{variant.quantity}</span>}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Service Information - Compact */}
        <div className="border-l-4 border-l-blue-500 bg-blue-50/50 border border-blue-200 rounded p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 text-sm">Política de cancelación</h4>
              
              <div className="space-y-1.5 text-xs text-blue-800">
                {isPostPayment && (
                  <div className="flex items-start gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1"></span>
                    <span><span className="font-medium">Post pago:</span> insumos adicionales se facturarán al completar el servicio</span>
                  </div>
                )}
                
                <div className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0 mt-1"></span>
                  <span>+24h gratis</span>
                </div>
                
                <div className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0 mt-1"></span>
                  <span>2-24h multa 20%</span>
                </div>
                
                <div className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 flex-shrink-0 mt-1"></span>
                  <span>-2h multa 50%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Button - Compact */}
        {bookingData ? (
          <RobustBookingButton
            bookingData={bookingData}
            onSuccess={onBookingSuccess}
            disabled={!isEssentialDataValid}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl py-3"
          />
        ) : (
          <Button
            onClick={onBooking}
            disabled={isLoading || !isEssentialDataValid}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl text-sm py-3"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Procesando...</span>
              </div>
            ) : (
              "Continuar al Pago"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingSummaryCard;
