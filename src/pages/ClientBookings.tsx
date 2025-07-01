
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
import { RecurringServicesSummaryCard } from '@/components/client/booking/RecurringServicesSummary';
import ClientPageLayout from '@/components/layout/ClientPageLayout';

const ClientBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { summary: recurringServicesSummary } = useRecurringServices();
  const { data: bookings, isLoading, error, refetch } = useClientBookings();
  
  console.log('=== CLIENT BOOKINGS PAGE ===');
  console.log(`Total bookings received: ${bookings?.length || 0}`);
  console.log('Recurring services summary:', recurringServicesSummary);
  
  const upcomingBookings = bookings?.filter(booking => 
    booking.status === 'pending' || booking.status === 'confirmed'
  ) || [];
  
  const pastBookings = bookings?.filter(booking => 
    booking.status === 'completed' || booking.status === 'cancelled'
  ) || [];
  
  // Separar citas recurrentes y únicas para mejor organización
  const upcomingRecurring = upcomingBookings.filter(booking => 
    booking.recurrence && booking.recurrence !== 'none'
  );
  
  const upcomingSingle = upcomingBookings.filter(booking => 
    !booking.recurrence || booking.recurrence === 'none'
  );
  
  const handleRated = () => {
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['recurring-services'] });
  };

  const handleRetry = () => {
    refetch();
  };

  // Crear subtítulo dinámico basado en las estadísticas
  const getSubtitle = () => {
    if (recurringServicesSummary.totalRecurringServices === 0) {
      return `${upcomingBookings.length} citas próximas`;
    }
    
    const parts = [];
    if (recurringServicesSummary.totalRecurringServices > 0) {
      parts.push(`${recurringServicesSummary.totalRecurringServices} servicio${recurringServicesSummary.totalRecurringServices > 1 ? 's' : ''} recurrente${recurringServicesSummary.totalRecurringServices > 1 ? 's' : ''}`);
    }
    if (recurringServicesSummary.totalActiveInstances > 0) {
      parts.push(`${recurringServicesSummary.totalActiveInstances} cita${recurringServicesSummary.totalActiveInstances > 1 ? 's' : ''} activa${recurringServicesSummary.totalActiveInstances > 1 ? 's' : ''}`);
    }
    
    return parts.join(' • ');
  };

  return (
    <ClientPageLayout 
      title="Mis Reservas"
      subtitle={getSubtitle()}
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
      
      {/* Resumen de servicios recurrentes */}
      <RecurringServicesSummaryCard 
        summary={recurringServicesSummary} 
        isLoading={isLoading}
      />
      
      <div className="space-y-8 px-1 md:px-2 lg:px-4 xl:px-6">
        {/* Citas Recurrentes Próximas */}
        {upcomingRecurring.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-4">
              Servicios Recurrentes
              <span className="text-sm text-muted-foreground ml-2">
                ({upcomingRecurring.length} próxima{upcomingRecurring.length > 1 ? 's' : ''})
              </span>
            </h2>
            <BookingsList
              bookings={upcomingRecurring}
              isLoading={isLoading}
              onRated={handleRated}
              emptyMessage="No hay servicios recurrentes próximos"
            />
          </section>
        )}
        
        {/* Citas Únicas Próximas */}
        <section>
          <h2 className="text-lg font-medium mb-4">
            {upcomingRecurring.length > 0 ? 'Citas Únicas' : 'Próximas Citas'}
            {upcomingSingle.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({upcomingSingle.length} próxima{upcomingSingle.length > 1 ? 's' : ''})
              </span>
            )}
          </h2>
          <BookingsList
            bookings={upcomingSingle}
            isLoading={isLoading}
            onRated={handleRated}
            emptyMessage={upcomingRecurring.length > 0 ? "No hay citas únicas próximas" : "No hay citas próximas"}
          />
        </section>
        
        {/* Citas Pasadas */}
        <section>
          <h2 className="text-lg font-medium mb-4">
            Historial
            {pastBookings.length > 0 && (
              <span className="text-sm text-muted-foreground ml-2">
                ({pastBookings.filter(b => b.recurrence && b.recurrence !== 'none').length} recurrentes, {pastBookings.filter(b => !b.recurrence || b.recurrence === 'none').length} únicas)
              </span>
            )}
          </h2>
          <BookingsList
            bookings={pastBookings}
            isLoading={isLoading}
            onRated={handleRated}
            emptyMessage="No hay citas en el historial"
          />
        </section>
      </div>
    </ClientPageLayout>
  );
};

export default ClientBookings;
