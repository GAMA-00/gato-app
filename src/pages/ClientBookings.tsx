
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { useClientBookings } from '@/hooks/useClientBookings';
import { useAppointmentCompletion } from '@/hooks/useAppointmentCompletion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingsList } from '@/components/client/booking/BookingsList';
import PendingInvoicesSection from '@/components/client/PendingInvoicesSection';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { logger, bookingLogger } from '@/utils/logger';

const ClientBookings = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Re-enable appointment completion for proper flow
  useAppointmentCompletion();
  
  const { summary: recurringServicesSummary } = useRecurringServices();
  const { data: bookings, isLoading, error, refetch } = useClientBookings();
  
  bookingLogger.info('=== CLIENT BOOKINGS PAGE ===');
  bookingLogger.dataProcessing(`Total bookings received: ${bookings?.length || 0}`);
  bookingLogger.debug('Recurring services summary:', recurringServicesSummary);
  
  // Filtrar SOLO citas futuras - tanto únicas como recurrentes
  const now = new Date();
  const validRecurrences = new Set(['weekly','biweekly','triweekly','monthly']);
  
  
  const activeBookings = bookings?.filter(booking => {
    // Excluir citas canceladas, rechazadas o completadas
    if (['cancelled', 'rejected', 'completed'].includes(booking.status)) {
      return false;
    }
    
    // Solo mostrar citas FUTURAS (pendientes o confirmadas)
    const isFuture = booking.date > now;
    const isActiveStatus = booking.status === 'pending' || booking.status === 'confirmed';
    
    if (!isFuture) {
      logger.debug(`Filtered out past appointment: ${booking.serviceName} - ${booking.date.toLocaleString()}`);
    }
    
    return isActiveStatus && isFuture;
  }) || [];
  
  bookingLogger.info(`Showing ${activeBookings.length} future appointments only`);

  // Obtener todas las citas completadas pendientes de calificar
  const allCompletedBookings = bookings?.filter(booking => 
    booking.status === 'completed' && !booking.isRated
  ) || [];

  // Auto-calificar servicios antiguos (más de 5) con 5 estrellas
  React.useEffect(() => {
    const autoRateOldServices = async () => {
      if (allCompletedBookings.length > 5) {
        const oldServices = allCompletedBookings.slice(5); // Servicios después de los 5 más recientes
        bookingLogger.info(`Auto-calificando ${oldServices.length} servicios antiguos con 5 estrellas`);
        
        try {
          // Auto-calificar cada servicio antiguo con 5 estrellas
          for (const booking of oldServices) {
            const { error } = await supabase
              .rpc('submit_provider_rating', {
                p_provider_id: booking.providerId,
                p_client_id: user?.id,
                p_appointment_id: booking.id,
                p_rating: 5,
                p_comment: null
              });
              
            if (error) {
              logger.error(`Error auto-calificando servicio ${booking.id}:`, error);
            } else {
              logger.rating(`Auto-calificado: ${booking.serviceName} con 5 estrellas`);
            }
          }
          
          // Refrescar la lista después de auto-calificar
          if (oldServices.length > 0) {
            handleRated();
          }
        } catch (error) {
          logger.error('Error en auto-calificación:', error);
        }
      }
    };

    if (user?.id && allCompletedBookings.length > 5) {
      autoRateOldServices();
    }
  }, [allCompletedBookings.length, user?.id]);

  // Mostrar solo los 5 servicios más recientes para calificar
  const completedBookings = allCompletedBookings.slice(0, 5);

  // Separar citas post-pago pendientes de factura vs listas para calificar
  const pendingInvoiceBookings = completedBookings.filter(booking => 
    booking.isPostPayment && !booking.canRate
  );
  
  const readyToRateBookings = completedBookings.filter(booking => booking.canRate);
  
  // Separar citas recurrentes y únicas para mejor organización
  const activeRecurring = activeBookings.filter(booking => 
    booking.recurrence && validRecurrences.has(booking.recurrence)
  );
  
  const activeSingle = activeBookings.filter(booking => 
    !booking.recurrence || !validRecurrences.has(booking.recurrence)
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
    
    const parts = [] as string[];
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
        {/* Facturas Pendientes de Post-Pago */}
        {pendingInvoiceBookings.length > 0 && (
          <section>
            <PendingInvoicesSection />
          </section>
        )}

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
        
        {/* Todas las Citas Completadas para Calificar */}
        {completedBookings.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-4">
              Calificar Servicios
              <span className="text-sm text-muted-foreground ml-2">
                ({completedBookings.length} servicio{completedBookings.length > 1 ? 's' : ''} para calificar)
              </span>
            </h2>
            <BookingsList
              bookings={completedBookings}
              isLoading={isLoading}
              onRated={handleRated}
              emptyMessage="No hay servicios completados para calificar"
            />
          </section>
        )}
      </div>
    </ClientPageLayout>
  );
};

export default ClientBookings;
