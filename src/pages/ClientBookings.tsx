
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { useClientBookings } from '@/hooks/useClientBookings';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingsList } from '@/components/client/booking/BookingsList';

const ClientBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { count: recurringServicesCount } = useRecurringServices();
  const { data: bookings, isLoading, error, refetch } = useClientBookings();
  
  console.log('=== CLIENT BOOKINGS PAGE ===');
  console.log(`Total bookings received: ${bookings?.length || 0}`);
  
  const upcomingBookings = bookings?.filter(booking => 
    booking.status === 'pending' || booking.status === 'confirmed'
  ) || [];
  
  const pastBookings = bookings?.filter(booking => 
    booking.status === 'completed' || booking.status === 'cancelled'
  ) || [];
  
  const activeRecurringCount = bookings?.filter(booking => 
    booking.isRecurringInstance && 
    (booking.status === 'pending' || booking.status === 'confirmed')
  ).length || 0;
  
  const handleRated = () => {
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
  };

  const handleRetry = () => {
    refetch();
  };

  return (
    <>
      <Navbar />
      <div className="md:ml-52">
        <PageContainer
          title="Mis Reservas"
          subtitle={`${activeRecurringCount} instancias recurrentes activas`}
        >
          {error && (
            <Alert className="mb-6">
              <AlertDescription className="space-y-4">
                <div>
                  <h4 className="font-medium text-red-800">Error al cargar las reservas</h4>
                  <p className="text-red-600 mt-1">
                    Ha ocurrido un error al cargar tus reservas. Por favor, intenta nuevamente.
                  </p>
                </div>
                <Button 
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6 px-1 md:px-2 lg:px-4 xl:px-6">
            <section>
              <BookingsList
                bookings={upcomingBookings}
                isLoading={isLoading}
                onRated={handleRated}
                emptyMessage="No hay citas próximas"
              />
            </section>
            
            <section>
              <h2 className="text-lg font-medium mb-4">
                Citas Pasadas
                {pastBookings.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({pastBookings.filter(b => b.isRecurringInstance).length} instancias recurrentes)
                  </span>
                )}
              </h2>
              <BookingsList
                bookings={pastBookings}
                isLoading={isLoading}
                onRated={handleRated}
                emptyMessage="No hay citas pasadas"
              />
            </section>
          </div>
        </PageContainer>
      </div>
    </>
  );
};

export default ClientBookings;
