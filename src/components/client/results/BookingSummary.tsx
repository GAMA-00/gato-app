
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { ServiceVariant } from '@/components/client/service/types';
import { Separator } from '@/components/ui/separator';

interface BookingSummaryProps {
  selectedVariants: ServiceVariant[];
  onSchedule: () => void;
}

const BookingSummary = ({ selectedVariants, onSchedule }: BookingSummaryProps) => {
  // Calculate totals
  const totalPrice = selectedVariants.reduce((sum, variant) => sum + Number(variant.price), 0);
  const totalDuration = selectedVariants.reduce((sum, variant) => sum + Number(variant.duration), 0);
  
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${mins > 0 ? `h ${mins}m` : 'h'}`;
  };
  
  return (
    <Card className="shadow-sm sticky top-4">
      <CardContent className="p-6">
        {selectedVariants.map((variant, index) => (
          <div key={variant.id || index} className="mb-5">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-medium">{variant.name}</h3>
              <span className="font-semibold">${Number(variant.price).toFixed(2)}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock size={16} className="mr-1" />
              <span className="text-sm">{formatDuration(Number(variant.duration))}</span>
            </div>
          </div>
        ))}
        
        <Separator className="my-4" />
        
        <div className="flex justify-between items-center mb-1 font-bold">
          <span className="text-lg">Total</span>
          <span className="text-lg">${totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Clock size={16} className="mr-1" />
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onSchedule} 
          className="w-full bg-[#4CAF50] hover:bg-[#43A047] text-white font-medium"
          size="lg"
        >
          <Calendar className="mr-2" /> Agendar servicio
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingSummary;
