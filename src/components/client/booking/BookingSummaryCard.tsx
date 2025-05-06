
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ServiceVariant } from '@/components/client/service/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { CalendarClock, Check, Clock } from 'lucide-react';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isRecommended: boolean;
}

interface BookingSummaryCardProps {
  selectedVariants: ServiceVariant[];
  selectedTimeSlot: TimeSlot | null;
  providerId: string;
  serviceId: string;
  onSchedule: () => void;
  basePrice?: number;
  commissionRate?: number;
}

const BookingSummaryCard = ({
  selectedVariants,
  selectedTimeSlot,
  providerId,
  serviceId,
  onSchedule,
  basePrice = 0,
  commissionRate = 20
}: BookingSummaryCardProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const calculateTotalPrice = () => {
    const variantsTotal = selectedVariants.reduce((sum, variant) => sum + Number(variant.price || 0), 0);
    const total = variantsTotal > 0 ? variantsTotal : basePrice;
    return total * (1 + commissionRate / 100);
  };
  
  const calculateTotalDuration = () => {
    const variantsDuration = selectedVariants.reduce((sum, variant) => sum + Number(variant.duration || 0), 0);
    return variantsDuration || 0;
  };

  const handleBookNow = () => {
    if (!selectedTimeSlot) {
      toast.error("Por favor selecciona una fecha y hora para continuar");
      return;
    }
    
    setIsSubmitting(true);
    
    // In a real implementation, we would save to the database here
    setTimeout(() => {
      setIsSubmitting(false);
      onSchedule();
    }, 1000);
  };

  return (
    <Card className="border-2 border-primary/10">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-lg">Resumen de Reserva</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Servicios seleccionados:</h3>
          <ul className="space-y-2">
            {selectedVariants.map((variant, index) => (
              <li key={index} className="flex justify-between text-sm">
                <span>{variant.name}</span>
                <span className="font-medium">${Number(variant.price).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t pt-2 mt-2 flex justify-between font-medium">
            <span>Precio base:</span>
            <span>${calculateTotalPrice().toFixed(2)}</span>
          </div>
        </div>
        
        <div className="bg-muted/50 rounded-md p-3 space-y-1">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-sm">
              Duración total: {calculateTotalDuration()} minutos
            </span>
          </div>
          
          {selectedTimeSlot && (
            <div className="flex items-center">
              <CalendarClock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">
                {format(selectedTimeSlot.startTime, "PPP", { locale: es })} • {format(selectedTimeSlot.startTime, "HH:mm")} - {format(selectedTimeSlot.endTime, "HH:mm")}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleBookNow}
          disabled={isSubmitting || !selectedTimeSlot}
        >
          {isSubmitting ? (
            "Procesando..."
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Solicitar Reserva
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default BookingSummaryCard;
