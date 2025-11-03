
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ServiceVariant } from '@/components/client/service/types';
import ServiceVariantItem from './ServiceVariantItem';

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
  
  const handleQuantityChange = (variantId: string, change: number) => {
    const currentQuantity = variantQuantities[variantId] || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    
    const newQuantities = {
      ...variantQuantities,
      [variantId]: newQuantity
    };
    
    // Remove variants with 0 quantity
    if (newQuantity === 0) {
      delete newQuantities[variantId];
    }
    
    setVariantQuantities(newQuantities);
    updateSelectedVariants(newQuantities, personQuantities);
  };

  const handlePersonQuantityChange = (variantId: string, change: number) => {
    const currentPersonQuantity = personQuantities[variantId] || 1;
    const newPersonQuantity = Math.max(1, currentPersonQuantity + change);
    
    const newPersonQuantities = {
      ...personQuantities,
      [variantId]: newPersonQuantity
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
        <CardTitle className="text-lg">Catálogo</CardTitle>
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
            
            return (
              <ServiceVariantItem
                key={variant.id}
                variant={variant}
                quantity={quantity}
                personQuantity={personQuantity}
                onQuantityChange={(change) => handleQuantityChange(variant.id, change)}
                onPersonQuantityChange={(change) => handlePersonQuantityChange(variant.id, change)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
