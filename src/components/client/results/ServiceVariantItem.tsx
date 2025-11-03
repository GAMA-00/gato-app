import React from 'react';
import { Clock } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';
import QuantityControls from './QuantityControls';
import ServicePrice from './ServicePrice';

interface ServiceVariantItemProps {
  variant: ServiceVariant;
  quantity: number;
  personQuantity: number;
  onQuantityChange: (change: number) => void;
  onPersonQuantityChange: (change: number) => void;
}

const ServiceVariantItem = ({
  variant,
  quantity,
  personQuantity,
  onQuantityChange,
  onPersonQuantityChange
}: ServiceVariantItemProps) => {
  const hasPersonPricing = variant.additionalPersonPrice && Number(variant.additionalPersonPrice) > 0;

  const formatDuration = () => {
    const hours = Math.floor(variant.duration / 60);
    const minutes = variant.duration % 60;
    return `${hours > 0 ? `${hours}h ` : ''}${minutes > 0 ? `${minutes}min` : ''}`;
  };

  return (
    <div className="space-y-3">
      {/* Mobile layout - Compact card design */}
      <div className="md:hidden bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-base">{variant.name}</h4>
            <div className="flex items-center text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3 mr-1" />
              <span>{formatDuration()}</span>
            </div>
          </div>
          <span className="text-lg font-bold ml-4">${Number(variant.price)}</span>
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-3">
          <QuantityControls
            quantity={quantity}
            onQuantityChange={onQuantityChange}
            size="mobile"
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:grid grid-cols-12 gap-3 items-start py-3">
        <div className="col-span-5">
          <h4 className="font-medium text-base">{variant.name}</h4>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatDuration()}</span>
          </div>
        </div>
        
        <div className="col-span-3">
          <ServicePrice
            price={Number(variant.price)}
            additionalPersonPrice={variant.additionalPersonPrice ? Number(variant.additionalPersonPrice) : undefined}
            layout="desktop"
            alignment="left"
          />
        </div>
        
        <div className="col-span-4 flex items-center justify-center">
          <QuantityControls
            quantity={quantity}
            onQuantityChange={onQuantityChange}
            size="desktop"
          />
        </div>
      </div>

      {/* Person quantity section - only show when service is selected and has per-person pricing */}
      {quantity > 0 && hasPersonPricing && (
        <div className="py-2 pl-4 bg-muted/30 rounded-lg">
          {/* Mobile person quantity */}
          <div className="md:hidden flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Cantidad de personas</p>
              {variant.maxPersons && (
                <p className="text-xs text-muted-foreground">
                  Máximo: {variant.maxPersons} personas
                </p>
              )}
            </div>
            
            <QuantityControls
              quantity={personQuantity}
              onQuantityChange={onPersonQuantityChange}
              minQuantity={1}
              maxQuantity={variant.maxPersons ? Number(variant.maxPersons) : undefined}
              size="mobile"
            />
          </div>

          {/* Desktop person quantity */}
          <div className="hidden md:grid grid-cols-12 gap-3 items-center">
            <div className="col-span-5">
              <p className="text-sm font-medium">Cantidad de personas</p>
              {variant.maxPersons && (
                <p className="text-xs text-muted-foreground">
                  Máximo: {variant.maxPersons} personas
                </p>
              )}
            </div>
            
            <div className="col-span-3"></div>
            
            <div className="col-span-4 flex items-center justify-center">
              <QuantityControls
                quantity={personQuantity}
                onQuantityChange={onPersonQuantityChange}
                minQuantity={1}
                maxQuantity={variant.maxPersons ? Number(variant.maxPersons) : undefined}
                size="desktop"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceVariantItem;