
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, ChevronRight, Clock, MapPin, Check } from 'lucide-react';
import { format } from 'date-fns';

// Mock bookings data
const MOCK_BOOKINGS = [
  {
    id: '1',
    serviceName: 'Limpieza de Casa',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 6, 15, 10, 0),
    duration: 120,
    status: 'upcoming'
  },
  {
    id: '2',
    serviceName: 'Peluquería para Mascotas',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 6, 20, 14, 0),
    duration: 60,
    status: 'upcoming'
  },
  {
    id: '3',
    serviceName: 'Lavado de Auto',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 5, 10, 9, 0),
    duration: 45,
    status: 'completed'
  }
];

const ClientBookings = () => {
  const navigate = useNavigate();
  
  const upcomingBookings = MOCK_BOOKINGS.filter(booking => booking.status === 'upcoming');
  const pastBookings = MOCK_BOOKINGS.filter(booking => booking.status === 'completed');

  return (
    <PageContainer
      title="Mis Reservas"
      subtitle="Ver y administrar tus citas"
      action={
        <Button onClick={() => navigate('/client')}>
          Reservar Nuevo Servicio
        </Button>
      }
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-medium mb-4">Citas Próximas</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-4">
              {upcomingBookings.map(booking => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="bg-primary/10 md:w-32 p-6 flex flex-col justify-center items-center">
                        <CalendarClock className="h-6 w-6 text-primary mb-2" />
                        <div className="text-center">
                          <div className="font-medium">{format(booking.date, 'MMM')}</div>
                          <div className="text-2xl font-bold">{format(booking.date, 'd')}</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6">
                        <h3 className="font-medium text-lg">{booking.serviceName}</h3>
                        
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{format(booking.date, 'h:mm a')} ({booking.duration} min)</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{booking.buildingName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t md:border-t-0 md:border-l p-6 flex items-center">
                        <Button variant="outline">
                          Detalles
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay citas próximas</p>
          )}
        </section>
        
        <section>
          <h2 className="text-xl font-medium mb-4">Citas Pasadas</h2>
          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              {pastBookings.map(booking => (
                <Card key={booking.id} className="overflow-hidden bg-muted/30">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="bg-muted/30 md:w-32 p-6 flex flex-col justify-center items-center">
                        <Check className="h-6 w-6 text-muted-foreground mb-2" />
                        <div className="text-center text-muted-foreground">
                          <div className="font-medium">{format(booking.date, 'MMM')}</div>
                          <div className="text-2xl font-bold">{format(booking.date, 'd')}</div>
                        </div>
                      </div>
                      
                      <div className="flex-1 p-6">
                        <h3 className="font-medium text-lg">{booking.serviceName}</h3>
                        
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>{format(booking.date, 'h:mm a')} ({booking.duration} min)</span>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>{booking.buildingName}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t md:border-t-0 md:border-l p-6 flex items-center">
                        <Button variant="outline">
                          Detalles
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No hay citas pasadas</p>
          )}
        </section>
      </div>
    </PageContainer>
  );
};

export default ClientBookings;
