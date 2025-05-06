
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface ServiceVariant {
  id: string;
  name: string;
  price: number;
  duration: number;
}

interface BookingSummaryProps {
  selectedVariants: ServiceVariant[];
  onSchedule: () => void;
}

const BookingSummary = ({ selectedVariants, onSchedule }: BookingSummaryProps) => {
  // Calculate totals
  const totalAmount = selectedVariants.reduce((sum, variant) => sum + variant.price, 0);
  const totalDuration = selectedVariants.reduce((sum, variant) => sum + variant.duration, 0);
  
  if (selectedVariants.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Resumen de reserva</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center">
            <ShoppingCart className="h-12 w-12 opacity-20 mb-2" />
            <p>No has seleccionado ningún servicio</p>
            <p className="text-sm mt-2">Selecciona los servicios que deseas agendar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Resumen de reserva</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {selectedVariants.map(variant => (
            <div key={variant.id} className="flex justify-between">
              <div>
                <p className="font-medium">{variant.name}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(variant.duration / 60) > 0 ? `${Math.floor(variant.duration / 60)}h ` : ''}
                  {variant.duration % 60 > 0 ? `${variant.duration % 60}min` : ''}
                </p>
              </div>
              <p className="font-medium">${variant.price.toFixed(2)}</p>
            </div>
          ))}
          
          <Separator className="my-3" />
          
          <div className="flex justify-between font-medium">
            <div>
              <p>Total</p>
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {Math.floor(totalDuration / 60) > 0 ? `${Math.floor(totalDuration / 60)}h ` : ''}
                {totalDuration % 60 > 0 ? `${totalDuration % 60}min` : ''}
              </p>
            </div>
            <p className="text-lg">${totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/10 p-4">
        <Button onClick={onSchedule} className="w-full bg-green-600 hover:bg-green-700 text-white">
          <Calendar className="mr-2 h-4 w-4" />
          Agendar servicio
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingSummary;
