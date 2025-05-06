
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarCheck2, Clock, Home, User, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingData = location.state?.bookingData;
  
  useEffect(() => {
    if (!bookingData) {
      navigate('/client/services');
      toast.error('No se encontró información de la reserva');
    }
  }, [bookingData, navigate]);
  
  const handleViewBookings = () => {
    navigate('/client/bookings');
  };
  
  const handleBackToServices = () => {
    navigate('/client/services');
  };
  
  if (!bookingData) {
    return null;
  }

  const { service, selectedTimeSlot, provider, selectedVariants } = bookingData;
  
  return (
    <PageContainer
      title="¡Reserva Solicitada!"
      subtitle="Tu solicitud ha sido enviada al proveedor"
    >
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border-green-100 bg-green-50">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <BadgeCheck className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-green-800">Solicitud enviada correctamente</h2>
            <p className="text-green-700">
              Tu solicitud de servicio ha sido enviada al proveedor para su confirmación.
              Te notificaremos cuando confirme la reserva.
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Servicio</h3>
              <p>{service?.name || service?.title}</p>
            </div>
            
            {selectedVariants && selectedVariants.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Opciones seleccionadas</h3>
                <ul className="space-y-1">
                  {selectedVariants.map((variant: any, index: number) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{variant.name}</span>
                      <span>${Number(variant.price).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="font-medium">Proveedor</h3>
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>{provider?.name}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium">Fecha y hora</h3>
                <div className="flex items-center">
                  <CalendarCheck2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedTimeSlot.startTime), "PPP", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    {format(new Date(selectedTimeSlot.startTime), "HH:mm")} - {format(new Date(selectedTimeSlot.endTime), "HH:mm")}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">Ubicación</h3>
                <div className="flex items-center">
                  <Home className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    {user?.building || 'Tu residencia'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 space-y-2">
              <h3 className="font-medium">Estado</h3>
              <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-md px-3 py-2 text-sm">
                Pendiente de confirmación por el proveedor
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline"
            className="flex-1" 
            onClick={handleBackToServices}
          >
            Explorar más servicios
          </Button>
          <Button 
            className="flex-1"
            onClick={handleViewBookings}
          >
            Ver mis reservas
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default BookingConfirmation;
