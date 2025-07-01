
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { useClientBookings } from '@/hooks/useClientBookings';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingsList } from '@/components/client/booking/BookingsList';
import ClientPageLayout from '@/components/layout/ClientPageLayout';

const ClientBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { summary: recurringServicesSummary } = useRecurringServices();
  const { data: bookings, isLoading, error, refetch } = useClientBookings();
  
  console.log('=== CLIENT BOOKINGS PAGE ===');
  console.log(`Total bookings received: ${bookings?.length || 0}`);
  console.log('Recurring services summary:', recurringServicesSummary);
  
  // Filtrar solo citas activas (pending/confirmed) y citas únicas futuras
  const now = new Date();
  const activeBookings = bookings?.filter(booking => {
    // Para citas recurrentes, mostrar solo las que están pending o confirmed
    if (booking.recurrence && booking.recurrence !== 'none') {
      return booking.status === 'pending' || booking.status === 'confirmed';
    }
    // Para citas únicas, mostrar solo las futuras que están pending o confirmed
    return (booking.status === 'pending' || booking.status === 'confirmed') && booking.date > now;
  }) || [];
  
  const pastBookings = bookings?.filter(booking => 
    booking.status === 'completed' || booking.status === 'cancelled'
  ) || [];
  
  // Separar citas recurrentes y únicas para mejor organización
  const activeRecurring = activeBookings.filter(booking => 
    booking.recurrence && booking.recurrence !== 'none'
  );
  
  const activeSingle = activeBookings.filter(booking => 
    !booking.recurrence || booking.recurrence === 'none'
  );
  
  const handleRated = () => {
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['recurring-services'] });
  };

  const handleRetry = () => {
    refetch();
  };

  // Crear subtítulo dinámico basado en las citas activas
  const getSubtitle = () => {
    const totalActive = activeBookings.length;
    if (totalActive === 0) {
      return 'No hay citas activas';
    }
    
    const parts = [];
    if (activeRecurring.length > 0) {
      parts.push(`${activeRecurring.length} servicio${activeRecurring.length > 1 ? 's' : ''} recurrente${activeRecurring.length > 1 ? 's' : ''}`);
    }
    if (activeSingle.length > 0) {
      parts.push(`${activeSingle.length} cita${activeSingle.length > 1 ? 's' : ''} única${activeSingle.length > 1 ? 's' : ''}`);
    }
    
    return parts.join(' • ');
  };

  return (
    <ClientPageLayout 
      title="Mis Reservas"
      subtitle={
        <span className={activeBookings.length > 0 ? "text-blue-600 font-medium" : ""}>
          {getSubtitle()}
        </span>
      }
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
      
      <div className="space-y-8 px-1 md:px-2 lg:px-4 xl:px-6">
        {/* Citas Recurrentes Activas */}
        {activeRecurring.length > 0 && (
          <section>
            <BookingsList
              bookings={activeRecurring}
              isLoading={isLoading}
              onRated={handleRated}
              emptyMessage="No hay servicios recurrentes activos"
            />
          </section>
        )}
        
        {/* Citas Únicas Activas */}
        {activeSingle.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-4">
              {activeRecurring.length > 0 ? 'Citas Únicas' : 'Próximas Citas'}
              <span className="text-sm text-muted-foreground ml-2">
                ({activeSingle.length} próxima{activeSingle.length > 1 ? 's' : ''})
              </span>
            </h2>
            <BookingsList
              bookings={activeSingle}
              isLoading={isLoading}
              onRated={handleRated}
              emptyMessage={activeRecurring.length > 0 ? "No hay citas únicas próximas" : "No hay citas próximas"}
            />
          </section>
        )}
        
        {/* Mostrar mensaje si no hay citas activas */}
        {activeBookings.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No tienes citas activas</p>
            <Button onClick={() => navigate('/client/services')}>
              Explorar servicios
            </Button>
          </div>
        )}
        
        {/* Citas Pasadas */}
        {pastBookings.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-4">
              Historial
              <span className="text-sm text-muted-foreground ml-2">
                ({pastBookings.filter(b => b.recurrence && b.recurrence !== 'none').length} recurrentes, {pastBookings.filter(b => !b.recurrence || b.recurrence === 'none').length} únicas)
              </span>
            </h2>
            <BookingsList
              bookings={pastBookings}
              isLoading={isLoading}
              onRated={handleRated}
              emptyMessage="No hay citas en el historial"
            />
          </section>
        )}
      </div>
    </ClientPageLayout>
  );
};

export default ClientBookings;
