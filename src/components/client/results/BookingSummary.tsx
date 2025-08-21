
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface BookingSummaryProps {
  selectedVariants: ServiceVariantWithQuantity[];
  onSchedule: () => void;
}

const BookingSummary = ({ selectedVariants, onSchedule }: BookingSummaryProps) => {
  // Calculate totals considering quantities and person counts
  const totalPrice = selectedVariants.reduce((sum, variant) => {
    const basePrice = Number(variant.price) * variant.quantity;
    const additionalPersonPrice = variant.personQuantity && variant.additionalPersonPrice 
      ? Number(variant.additionalPersonPrice) * (variant.personQuantity - 1) * variant.quantity
      : 0;
    return sum + basePrice + additionalPersonPrice;
  }, 0);
  
  const totalDuration = selectedVariants.reduce((sum, variant) => 
    sum + (Number(variant.duration) * variant.quantity), 0
  );
  const totalServices = selectedVariants.reduce((sum, variant) => sum + variant.quantity, 0);
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${mins > 0 ? `h ${mins}m` : 'h'}`;
  };
  
  const handleScheduleClick = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    onSchedule();
  };
  
  return (
    <Card className="shadow-sm sticky top-4 mb-6">
      <CardContent className="p-6">
        {selectedVariants.map((variant, index) => {
          const basePrice = Number(variant.price) * variant.quantity;
          const additionalPersonPrice = variant.personQuantity && variant.additionalPersonPrice 
            ? Number(variant.additionalPersonPrice) * (variant.personQuantity - 1) * variant.quantity
            : 0;
          const variantTotal = basePrice + additionalPersonPrice;

          return (
            <div key={variant.id || index} className="mb-5">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium">
                  {variant.name} {variant.quantity > 1 && <span className="text-muted-foreground">x{variant.quantity}</span>}
                </h3>
                <span className="font-semibold">${formatCurrency(variantTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center">
                  <Clock size={16} className="mr-1" />
                  <span className="text-sm">{formatDuration(Number(variant.duration) * variant.quantity)}</span>
                  {variant.personQuantity && variant.personQuantity > 1 && (
                    <span className="text-sm ml-2">• {variant.personQuantity} personas</span>
                  )}
                </div>
                {variant.quantity > 1 && (
                  <span className="text-sm">
                    ${formatCurrency(Number(variant.price))} c/u
                  </span>
                )}
              </div>
              {variant.personQuantity && variant.personQuantity > 1 && (
                <div className="text-xs text-muted-foreground mt-1">
                  Precio base: ${formatCurrency(basePrice)} + Personas extra: ${formatCurrency(additionalPersonPrice)}
                </div>
              )}
            </div>
          );
        })}
        
        <Separator className="my-4" />
        
        <div className="flex justify-between items-center mb-1 font-bold">
          <span className="text-lg">Total ({totalServices} servicio{totalServices !== 1 ? 's' : ''})</span>
          <span className="text-lg">${formatCurrency(totalPrice)}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Clock size={16} className="mr-1" />
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleScheduleClick} 
          className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
          size="lg"
        >
          <Calendar className="mr-2" /> Agendar servicio
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingSummary;
