
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Plus } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';
import { formatCurrency } from '@/lib/utils';

interface ServiceVariantsSelectorProps {
  variants: ServiceVariant[];
  onSelectVariant: (variants: ServiceVariant[]) => void;
}

const ServiceVariantsSelector = ({ variants, onSelectVariant }: ServiceVariantsSelectorProps) => {
  const [selectedVariants, setSelectedVariants] = React.useState<ServiceVariant[]>([]);
  
  const handleVariantToggle = (variant: ServiceVariant) => {
    const isSelected = selectedVariants.find(v => v.id === variant.id);
    let newSelection: ServiceVariant[];
    
    if (isSelected) {
      newSelection = selectedVariants.filter(v => v.id !== variant.id);
    } else {
      newSelection = [...selectedVariants, variant];
    }
    
    setSelectedVariants(newSelection);
    onSelectVariant(newSelection);
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
          const isSelected = selectedVariants.find(v => v.id === variant.id);
          
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
              
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleVariantToggle(variant)}
                className="ml-4"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
