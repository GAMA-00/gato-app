
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Clock, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';

interface ServiceSummaryCardProps {
  serviceTitle: string;
  clientLocation: string;
  isLoadingLocation: boolean;
  selectedVariant: ServiceVariant | undefined;
  formatPrice: (price: number | string) => string;
}

const ServiceSummaryCard = ({ 
  serviceTitle, 
  clientLocation, 
  isLoadingLocation, 
  selectedVariant, 
  formatPrice 
}: ServiceSummaryCardProps) => {
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
          {selectedVariant && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{selectedVariant.duration} minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  ${formatPrice(selectedVariant.price)}
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
