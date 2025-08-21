
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
      <CardContent className="space-y-3">
        {variants.map((variant) => {
          const quantity = variantQuantities[variant.id] || 0;
          const personQuantity = personQuantities[variant.id] || 1;
          const hasPersonPricing = variant.additionalPersonPrice && Number(variant.additionalPersonPrice) > 0;
          
          return (
            <div 
              key={variant.id}
              className="border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <h4 className="font-medium">{variant.name}</h4>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                      {Math.floor(variant.duration / 60) > 0 ? `${Math.floor(variant.duration / 60)}h ` : ''}
                      {variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ''}
                    </span>
                    <span className="mx-2">•</span>
                    <span>${formatCurrency(Number(variant.price))}</span>
                    {hasPersonPricing && (
                      <>
                        <span className="mx-2">•</span>
                        <span>+${formatCurrency(Number(variant.additionalPersonPrice))} por persona</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(variant, -1)}
                    disabled={quantity === 0}
                    className="h-8 w-8 p-0"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  <span className="min-w-[2rem] text-center font-medium">
                    {quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(variant, 1)}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Person quantity selector - only show when service is selected and has per-person pricing */}
              {quantity > 0 && hasPersonPricing && (
                <div className="px-4 pb-4 border-t bg-muted/30">
                  <div className="flex items-center justify-between pt-3">
                    <div className="flex-1">
                      <p className="font-medium text-sm">Cantidad de personas</p>
                      <p className="text-xs text-muted-foreground">
                        Precio base incluye 1 persona
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePersonQuantityChange(variant, -1)}
                        disabled={personQuantity <= 1}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      
                      <span className="min-w-[2rem] text-center font-medium">
                        {personQuantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePersonQuantityChange(variant, 1)}
                        disabled={variant.maxPersons ? personQuantity >= Number(variant.maxPersons) : false}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {variant.maxPersons && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Máximo: {variant.maxPersons} personas
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
