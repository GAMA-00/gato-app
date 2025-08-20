
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';

interface ServiceSummaryCardProps {
  serviceTitle: string;
  clientLocation: string;
  isLoadingLocation: boolean;
  selectedVariant?: ServiceVariant;
  selectedVariants?: Array<ServiceVariant & { quantity: number }>;
  formatPrice: (price: number | string) => string;
}

const ServiceSummaryCard = ({ 
  serviceTitle, 
  clientLocation, 
  isLoadingLocation, 
  selectedVariant, 
  selectedVariants = [],
  formatPrice 
}: ServiceSummaryCardProps) => {
  // Calculate totals when multiple variants are selected
  const totalDuration = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + (Number(variant.duration) * variant.quantity), 0)
    : (selectedVariant ? Number(selectedVariant.duration) : 0);
  
  const totalPrice = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + (Number(variant.price) * variant.quantity), 0)
    : (selectedVariant ? Number(selectedVariant.price) : 0);

  const totalServices = selectedVariants.length > 0 
    ? selectedVariants.reduce((sum, variant) => sum + variant.quantity, 0)
    : (selectedVariant ? 1 : 0);
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <CalendarIcon className="h-6 w-6 text-primary" />
          {serviceTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {isLoadingLocation ? 'Cargando ubicación...' : clientLocation}
            </span>
          </div>
          {(selectedVariant || selectedVariants.length > 0) && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {totalDuration} minutos
                  {totalServices > 1 && <span className="text-muted-foreground"> ({totalServices} servicios)</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatPrice(totalPrice)}
                  {selectedVariants.length > 0 && <span className="text-muted-foreground"> total</span>}
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceSummaryCard;
