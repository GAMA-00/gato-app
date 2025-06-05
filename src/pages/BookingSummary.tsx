import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, MapPin, User, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import PageContainer from '@/components/layout/PageContainer';

interface BookingData {
  providerId: string;
  listingId: string;
  date: Date | string;
  startTime: string;
  endTime: string;
  price: number;
  serviceName: string;
  providerName: string;
  notes?: string;
  recurrence?: string;
  recurrenceEndDate?: Date | string;
}

const BookingSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isBooking, setIsBooking] = useState(false);

  const bookingData = location.state as BookingData;

  if (!bookingData) {
    return (
      <PageContainer 
        title="Error"
        subtitle="No se encontraron datos de reserva"
      >
        <Alert>
          <AlertDescription>
            No se encontraron datos de reserva. Por favor regresa y selecciona un servicio.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/client')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a servicios
        </Button>
      </PageContainer>
    );
  }

  // Validate required fields
  const missingFields = [];
  if (!bookingData.date) missingFields.push('fecha');
  if (!bookingData.startTime) missingFields.push('hora de inicio');
  if (!bookingData.endTime) missingFields.push('hora de fin');
  if (!bookingData.providerId) missingFields.push('proveedor');
  if (!bookingData.listingId) missingFields.push('servicio');

  if (missingFields.length > 0) {
    return (
      <PageContainer 
        title="Error"
        subtitle="Datos incompletos"
      >
        <Alert>
          <AlertDescription>
            Faltan datos requeridos para la reserva: {missingFields.join(', ')}. 
            Por favor regresa y completa la información.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer 
        title="Cargando..."
        subtitle="Preparando tu resumen de reserva"
      >
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-32" />
        </div>
      </PageContainer>
    );
  }

  // Parse date safely
  const parseDate = (dateValue: Date | string): Date | null => {
    try {
      if (!dateValue) return null;
      
      if (dateValue instanceof Date) {
        return !isNaN(dateValue.getTime()) ? dateValue : null;
      }
      
      const parsedDate = new Date(dateValue);
      return !isNaN(parsedDate.getTime()) ? parsedDate : null;
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  };

  const bookingDate = parseDate(bookingData.date);
  const recurrenceEndDate = bookingData.recurrenceEndDate ? parseDate(bookingData.recurrenceEndDate) : null;

  if (!bookingDate) {
    return (
      <PageContainer 
        title="Error"
        subtitle="Fecha no válida"
      >
        <Alert>
          <AlertDescription>
            Error en los datos de fecha. Por favor intenta nuevamente.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      </PageContainer>
    );
  }

  const handleConfirmBooking = async () => {
    if (!user || !bookingDate) {
      toast.error("Error en los datos de reserva");
      return;
    }

    setIsBooking(true);

    try {
      // Calculate start and end times
      const startDateTime = new Date(bookingDate);
      const [startHours, startMinutes] = bookingData.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(bookingDate);
      const [endHours, endMinutes] = bookingData.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      // Create the appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          listing_id: bookingData.listingId,
          provider_id: bookingData.providerId,
          client_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'pending',
          notes: bookingData.notes || null,
          recurrence: bookingData.recurrence || 'none'
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating appointment:", error);
        throw error;
      }

      toast.success("¡Reserva solicitada exitosamente!");
      
      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] })
      ]);

      navigate('/client/bookings');
      
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(`Error al crear la reserva: ${error.message}`);
    } finally {
      setIsBooking(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: 'CRC',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getLocationDisplay = () => {
    const locationParts = [];
    
    // Add residencia name if available
    if (user.buildingName) {
      locationParts.push(user.buildingName);
    } else if (user.residenciaId) {
      locationParts.push('Residencia registrada');
    }
    
    // Add condominium name if available
    if (user.condominiumName) {
      locationParts.push(user.condominiumName);
    }
    
    // Add house number with # prefix for consistency
    if (user.houseNumber) {
      locationParts.push(`#${user.houseNumber}`);
    } else if (user.apartment) {
      locationParts.push(`#${user.apartment}`);
    }
    
    return locationParts.length > 0 ? locationParts.join(' – ') : 'Ubicación no especificada';
  };

  const formatDate = (date: Date) => {
    try {
      return format(date, 'PPP', { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Fecha no válida';
    }
  };

  const getRecurrenceText = (recurrence: string) => {
    switch (recurrence) {
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quincenal';
      case 'monthly': return 'Mensual';
      case 'once':
      default: return 'Una vez';
    }
  };

  return (
    <PageContainer 
      title="Resumen de Reserva"
      subtitle="Revisa los detalles antes de confirmar"
      action={
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Atrás
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Service Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <User className="h-5 w-5 mr-2" />
              Detalles del Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div>
              <h3 className="font-medium text-base">{bookingData.serviceName}</h3>
              <p className="text-sm text-muted-foreground">Proveedor: {bookingData.providerName}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <span>{bookingDate ? formatDate(bookingDate) : 'Fecha no válida'}</span>
              </div>

              <div className="flex items-center text-sm">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                <span>{bookingData.startTime} - {bookingData.endTime}</span>
              </div>

              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="break-words">{getLocationDisplay()}</span>
              </div>
            </div>

            {bookingData.recurrence && (
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-xs text-blue-600">
                  Recurrencia: {getRecurrenceText(bookingData.recurrence)}
                </p>
              </div>
            )}

            {bookingData.notes && (
              <div>
                <p className="text-sm font-medium">Notas:</p>
                <p className="text-sm text-muted-foreground break-words">{bookingData.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <CreditCard className="h-5 w-5 mr-2" />
              Detalles de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center text-lg font-medium">
              <span>Total:</span>
              <span>{formatPrice(bookingData.price)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button 
            onClick={handleConfirmBooking} 
            disabled={isBooking}
            className="w-full h-12"
            size="lg"
          >
            {isBooking ? "Procesando..." : "Confirmar Reserva"}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground px-2 leading-relaxed">
            Al confirmar tu reserva, el proveedor recibirá una solicitud que deberá aprobar.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default BookingSummary;
