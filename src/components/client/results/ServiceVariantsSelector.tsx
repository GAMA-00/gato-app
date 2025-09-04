
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Minus } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';
import { formatCurrency } from '@/lib/utils';

export interface ServiceVariantWithQuantity extends ServiceVariant {
  quantity: number;
  personQuantity?: number; // Cantidad de personas cuando el servicio tiene precio por persona
}

interface ServiceVariantsSelectorProps {
  variants: ServiceVariant[];
  onSelectVariant: (variants: ServiceVariantWithQuantity[]) => void;
}

const ServiceVariantsSelector = ({ variants, onSelectVariant }: ServiceVariantsSelectorProps) => {
  const [variantQuantities, setVariantQuantities] = React.useState<{ [key: string]: number }>({});
  const [personQuantities, setPersonQuantities] = React.useState<{ [key: string]: number }>({});
  
  const handleQuantityChange = (variant: ServiceVariant, change: number) => {
    const currentQuantity = variantQuantities[variant.id] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    const newQuantities = {
      ...variantQuantities,
      [variant.id]: newQuantity
    };
    
    // Remove variants with 0 quantity
    if (newQuantity === 0) {
      delete newQuantities[variant.id];
    }
    
    setVariantQuantities(newQuantities);
    updateSelectedVariants(newQuantities, personQuantities);
  };

  const handlePersonQuantityChange = (variant: ServiceVariant, change: number) => {
    const currentPersonQuantity = personQuantities[variant.id] || 1;
    const newPersonQuantity = Math.max(1, currentPersonQuantity + change);
    
    const newPersonQuantities = {
      ...personQuantities,
      [variant.id]: newPersonQuantity
    };
    
    setPersonQuantities(newPersonQuantities);
    updateSelectedVariants(variantQuantities, newPersonQuantities);
  };

  const updateSelectedVariants = (varQuantities: { [key: string]: number }, persQuantities: { [key: string]: number }) => {
    // Convert to array with quantities for parent component
    const selectedVariantsWithQuantities: ServiceVariantWithQuantity[] = Object.entries(varQuantities)
      .map(([variantId, quantity]) => {
        const variant = variants.find(v => v.id === variantId);
        const personQuantity = persQuantities[variantId];
        return variant ? { 
          ...variant, 
          quantity,
          ...(variant.additionalPersonPrice && personQuantity ? { personQuantity } : {})
        } : null;
      })
      .filter(Boolean) as ServiceVariantWithQuantity[];
    
    onSelectVariant(selectedVariantsWithQuantities);
  };
  
  if (!variants || variants.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Servicios disponibles</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Header columns - hidden on mobile */}
        <div className="hidden md:grid grid-cols-12 gap-3 pb-2 mb-4 border-b text-sm font-medium text-muted-foreground">
          <div className="col-span-5"></div>
          <div className="col-span-3 text-left">Precio</div>
          <div className="col-span-4 text-center">Cantidad</div>
        </div>
        
        <div className="space-y-4">
          {variants.map((variant) => {
            const quantity = variantQuantities[variant.id] || 0;
            const personQuantity = personQuantities[variant.id] || 1;
            const hasPersonPricing = variant.additionalPersonPrice && Number(variant.additionalPersonPrice) > 0;
            
            const formatPriceWithoutDecimals = (price: number) => {
              return price % 1 === 0 ? `$${price}` : formatCurrency(price);
            };
            
            return (
              <div key={variant.id} className="space-y-3">
                {/* Mobile layout */}
                <div className="md:hidden">
                  <div className="space-y-2 py-3">
                    {/* Service name and duration */}
                    <div>
                      <h4 className="font-medium text-base">{variant.name}</h4>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {Math.floor(variant.duration / 60) > 0 ? `${Math.floor(variant.duration / 60)}h ` : ''}
                          {variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ''}
                        </span>
                      </div>
                    </div>
                    
                    {/* Price and quantity aligned with service name */}
                    <div className="flex items-center justify-between">
                      {/* Price */}
                      <div className="flex flex-col">
                        <div className="font-medium">{formatPriceWithoutDecimals(Number(variant.price))}</div>
                        {hasPersonPricing && (
                          <div className="text-xs text-muted-foreground mt-1">
                            +{formatPriceWithoutDecimals(Number(variant.additionalPersonPrice))} pp
                          </div>
                        )}
                      </div>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(variant, -1)}
                          disabled={quantity === 0}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="min-w-[2rem] text-center font-medium text-base">
                          {quantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(variant, 1)}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:block relative py-3">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <h4 className="font-medium text-base">{variant.name}</h4>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {Math.floor(variant.duration / 60) > 0 ? `${Math.floor(variant.duration / 60)}h ` : ''}
                          {variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-span-4 flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(variant, -1)}
                        disabled={quantity === 0}
                        className="h-8 w-8 p-0 shrink-0 rounded-full"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="min-w-[2rem] text-center font-medium text-lg">
                        {quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(variant, 1)}
                        className="h-8 w-8 p-0 shrink-0 rounded-full"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Price positioned between service name and quantity controls */}
                  <div className="absolute top-1/2 left-0 transform -translate-y-1/2 grid grid-cols-12 gap-3 w-full pointer-events-none">
                    <div className="col-span-5"></div>
                    <div className="col-span-3">
                      <div className="font-medium">{formatPriceWithoutDecimals(Number(variant.price))}</div>
                      {hasPersonPricing && (
                        <div className="text-xs text-muted-foreground mt-1">
                          +{formatPriceWithoutDecimals(Number(variant.additionalPersonPrice))} por persona
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Person quantity row - only show when service is selected and has per-person pricing */}
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
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePersonQuantityChange(variant, -1)}
                          disabled={personQuantity <= 1}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="min-w-[2rem] text-center font-medium text-base">
                          {personQuantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePersonQuantityChange(variant, 1)}
                          disabled={variant.maxPersons ? personQuantity >= Number(variant.maxPersons) : false}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
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
                      
                      <div className="col-span-4 flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePersonQuantityChange(variant, -1)}
                          disabled={personQuantity <= 1}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="min-w-[2rem] text-center font-medium text-lg">
                          {personQuantity}
                        </span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePersonQuantityChange(variant, 1)}
                          disabled={variant.maxPersons ? personQuantity >= Number(variant.maxPersons) : false}
                          className="h-8 w-8 p-0 shrink-0 rounded-full"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
