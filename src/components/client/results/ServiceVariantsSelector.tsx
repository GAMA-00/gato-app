
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Plus, Check } from 'lucide-react';

interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface ServiceVariantsSelectorProps {
  variants: ServiceVariant[];
  onSelectVariant: (selectedVariants: ServiceVariant[]) => void;
}

const ServiceVariantsSelector = ({ variants, onSelectVariant }: ServiceVariantsSelectorProps) => {
  const [selectedVariants, setSelectedVariants] = useState<ServiceVariant[]>([]);
  
  const toggleVariant = (variant: ServiceVariant) => {
    const isSelected = selectedVariants.some(v => v.id === variant.id);
    
    let newSelected: ServiceVariant[];
    if (isSelected) {
      newSelected = selectedVariants.filter(v => v.id !== variant.id);
    } else {
      newSelected = [...selectedVariants, variant];
    }
    
    setSelectedVariants(newSelected);
    onSelectVariant(newSelected);
  };
  
  const isSelected = (id: string) => selectedVariants.some(v => v.id === id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Servicios disponibles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {variants.map(variant => (
            <div 
              key={variant.id}
              className={`p-3 rounded-md border transition-colors ${
                isSelected(variant.id) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{variant.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>
                        {Math.floor(variant.duration / 60) > 0 ? `${Math.floor(variant.duration / 60)}h ` : ''}
                        {variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ''}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>${variant.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant={isSelected(variant.id) ? "default" : "outline"}
                  size="sm"
                  className={isSelected(variant.id) ? "bg-luxury-navy text-white" : ""}
                  onClick={() => toggleVariant(variant)}
                >
                  {isSelected(variant.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceVariantsSelector;
