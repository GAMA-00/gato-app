
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus, Minus } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';
import { formatCurrency } from '@/lib/utils';

export interface ServiceVariantWithQuantity extends ServiceVariant {
  quantity: number;
}

interface ServiceVariantsSelectorProps {
  variants: ServiceVariant[];
  onSelectVariant: (variants: ServiceVariantWithQuantity[]) => void;
}

const ServiceVariantsSelector = ({ variants, onSelectVariant }: ServiceVariantsSelectorProps) => {
  const [variantQuantities, setVariantQuantities] = React.useState<{ [key: string]: number }>({});
  
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
    
    // Convert to array with quantities for parent component
    const selectedVariantsWithQuantities: ServiceVariantWithQuantity[] = Object.entries(newQuantities)
      .map(([variantId, quantity]) => {
        const variant = variants.find(v => v.id === variantId);
        return variant ? { ...variant, quantity } : null;
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
          
          return (
            <div 
              key={variant.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <h4 className="font-medium">{variant.name}</h4>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{variant.duration}h</span>
                  <span className="mx-2">•</span>
                  <span>${formatCurrency(Number(variant.price))}</span>
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
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
