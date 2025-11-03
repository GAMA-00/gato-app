
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
    <div className="bg-stone-50 px-4 py-6 rounded-lg">
      <h3 className="text-base font-medium text-stone-600 mb-4">
        Servicios disponibles
      </h3>
      
      <div className="space-y-3">
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
    </div>
  );
};

export default ServiceVariantsSelector;
