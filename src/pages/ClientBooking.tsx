
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_SERVICES } from '@/lib/data';
import { Service, Building } from '@/lib/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import RequireAuth from '@/components/auth/RequireAuth';

// Mock buildings data
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Torres del Atardecer', address: '123 Blvd. Atardecer' },
  { id: '2', name: 'Apartamentos Vista al Mar', address: '456 Calle del Océano' },
  { id: '3', name: 'Alturas de la Montaña', address: '789 Carretera Montaña' },
  { id: '4', name: 'Residencias Centro de la Ciudad', address: '101 Calle Principal' },
  { id: '5', name: 'Condominios Parque', address: '202 Avenida del Parque' }
];

// Mock available time slots
const AVAILABLE_TIMES = [
  '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
];

const ClientBookingContent = () => {
  const { buildingId, serviceId } = useParams<{ buildingId: string, serviceId: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  useEffect(() => {
    // En una aplicación real, obtendríamos estos datos de una API
    const selectedBuilding = MOCK_BUILDINGS.find(b => b.id === buildingId) || null;
    const selectedService = MOCK_SERVICES.find(s => s.id === serviceId) || null;
    
    setBuilding(selectedBuilding);
    setService(selectedService);
  }, [buildingId, serviceId]);

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime || !user) return;
    
    // En una aplicación real, enviaríamos esta información a una API
    toast.success('¡Cita reservada exitosamente!');
    navigate('/client/bookings');
  };

  if (!building || !service) {
    return (
      <PageContainer title="Cargando...">
        <div>Cargando detalles del servicio...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Reservar Cita"
      subtitle={`${service.name} en ${building.name}`}
    >
      <div className="grid gap-8 grid-cols-1 md:grid-cols-1">
        {/* Service Details Card - Now displayed first */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Servicio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">{service.name}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="flex justify-between">
                <span>Duración:</span>
                <span>{service.duration} minutos</span>
              </p>
              <p className="flex justify-between">
                <span>Precio:</span>
                <span>${service.price.toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Ubicación:</span>
                <span>{building.name}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Date and Time Selection Card - Now displayed second */}
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Fecha y Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-4">Selecciona una fecha</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border pointer-events-auto"
                  locale={es}
                />
              </div>
              
              {selectedDate && (
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-4">Horarios disponibles para {format(selectedDate, 'MMM d, yyyy', { locale: es })}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {AVAILABLE_TIMES.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className="w-full h-12 justify-center text-sm py-3"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate(`/client/services/${buildingId}`)}>
              Volver a Servicios
            </Button>
            <Button 
              disabled={!selectedDate || !selectedTime}
              onClick={handleBookAppointment}
              className="bg-golden-whisker text-heading hover:bg-golden-whisker-hover"
            >
              Reservar Cita
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
};

// Componente wrapper que protege la ruta
const ClientBooking = () => {
  return (
    <RequireAuth requirePaymentMethod={true}>
      <ClientBookingContent />
    </RequireAuth>
  );
};

export default ClientBooking;
