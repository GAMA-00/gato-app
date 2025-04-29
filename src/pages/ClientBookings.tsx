
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarClock, Clock, Calendar, X, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecurringServices } from '@/hooks/useRecurringServices';

// Mock bookings data structure updated
const MOCK_BOOKINGS = [
  {
    id: '1',
    serviceName: 'Limpieza de Casa',
    subcategory: 'Limpieza Regular',
    providerName: 'María González',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 6, 15, 15, 0),
    duration: 120,
    recurrence: 'weekly',
    status: 'upcoming'
  },
  {
    id: '2',
    serviceName: 'Peluquería para Mascotas',
    subcategory: 'Corte de Pelo',
    providerName: 'Juan Pérez',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 6, 20, 14, 0),
    duration: 60,
    recurrence: 'none',
    status: 'upcoming'
  },
  {
    id: '3',
    serviceName: 'Lavado de Auto',
    subcategory: 'Lavado Completo',
    providerName: 'Ana Rodríguez',
    buildingName: 'Torres del Atardecer',
    date: new Date(2023, 5, 10, 9, 0),
    duration: 45,
    recurrence: 'none',
    status: 'completed'
  }
];

const BookingCard = ({ booking }: { booking: typeof MOCK_BOOKINGS[0] }) => {
  const isRecurring = booking.recurrence !== 'none';
  
  return (
    <Card className="mb-4 overflow-hidden animate-scale-in">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <h3 className="font-medium text-base">{booking.serviceName}</h3>
              {isRecurring && (
                <div className="flex items-center ml-2 text-red-500">
                  <Flame className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              booking.status === 'upcoming' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
            )}>
              {isRecurring ? 'Recurrente' : 'Una vez'}
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">{booking.subcategory}</p>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {isRecurring ? (
                `Todos los ${format(booking.date, 'EEEE', { locale: es })} - ${format(booking.date, 'h:mm a')}`
              ) : (
                format(booking.date, 'PPP - h:mm a', { locale: es })
              )}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="text-muted-foreground">Proveedor:</span>{' '}
            <span className="font-medium">{booking.providerName}</span>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Reagendar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ClientBookings = () => {
  const navigate = useNavigate();
  const { count: recurringServicesCount } = useRecurringServices();
  
  const upcomingBookings = MOCK_BOOKINGS.filter(booking => booking.status === 'upcoming');
  const pastBookings = MOCK_BOOKINGS.filter(booking => booking.status === 'completed');

  return (
    <PageContainer
      title={
        <div className="flex items-center gap-2">
          <span>Mis Reservas</span>
          {recurringServicesCount > 0 && (
            <div className="flex items-center text-red-500">
              <Flame className="h-5 w-5" />
              <span className="font-medium ml-0.5">{Math.min(recurringServicesCount, 5)}</span>
            </div>
          )}
        </div>
      }
      subtitle="Ver y administrar tus citas"
      action={
        <Button onClick={() => navigate('/client')}>
          Reservar Nuevo Servicio
        </Button>
      }
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-medium mb-4">Citas Próximas</h2>
          {upcomingBookings.length > 0 ? (
            <div>
              {upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay citas próximas
            </p>
          )}
        </section>
        
        <section>
          <h2 className="text-lg font-medium mb-4">Citas Pasadas</h2>
          {pastBookings.length > 0 ? (
            <div>
              {pastBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No hay citas pasadas
            </p>
          )}
        </section>
      </div>
    </PageContainer>
  );
};

export default ClientBookings;
