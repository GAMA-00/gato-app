
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
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            No se encontraron datos de reserva. Por favor regresa y selecciona un servicio.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/client')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a servicios
        </Button>
      </div>
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
      <div className="container mx-auto px-4 py-8">
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
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-12 w-32" />
        </div>
      </div>
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
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertDescription>
            Error en los datos de fecha. Por favor intenta nuevamente.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
      </div>
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
    
    if (user.residenciaId) {
      locationParts.push('Residencia registrada');
    }
    
    if (user.condominiumName) {
      locationParts.push(user.condominiumName);
    }
    
    if (user.houseNumber) {
      locationParts.push(`Casa ${user.houseNumber}`);
    }
    
    return locationParts.length > 0 ? locationParts.join(' - ') : 'Ubicación no especificada';
  };

  const formatDate = (date: Date) => {
    try {
      return format(date, 'PPP', { locale: es });
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Fecha no válida';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Atrás
        </Button>
        <h1 className="text-3xl font-bold">Resumen de Reserva</h1>
        <p className="text-muted-foreground">Revisa los detalles antes de confirmar</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Detalles del Servicio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">{bookingData.serviceName}</h3>
            <p className="text-sm text-muted-foreground">Proveedor: {bookingData.providerName}</p>
          </div>

          <Separator />

          <div className="flex items-center text-sm">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{formatDate(bookingDate)}</span>
          </div>

          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{bookingData.startTime} - {bookingData.endTime}</span>
          </div>

          <div className="flex items-center text-sm">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{getLocationDisplay()}</span>
          </div>

          {bookingData.recurrence && bookingData.recurrence !== 'none' && (
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm font-medium text-blue-800">Servicio Recurrente</p>
              <p className="text-xs text-blue-600">
                {bookingData.recurrence === 'weekly' ? 'Semanal' :
                 bookingData.recurrence === 'biweekly' ? 'Quincenal' :
                 bookingData.recurrence === 'monthly' ? 'Mensual' : bookingData.recurrence}
              </p>
            </div>
          )}

          {bookingData.notes && (
            <div>
              <p className="text-sm font-medium">Notas:</p>
              <p className="text-sm text-muted-foreground">{bookingData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Detalles de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center text-lg font-medium">
            <span>Total:</span>
            <span>{formatPrice(bookingData.price)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Button 
          onClick={handleConfirmBooking} 
          disabled={isBooking}
          className="w-full"
          size="lg"
        >
          {isBooking ? "Procesando..." : "Confirmar Reserva"}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          Al confirmar tu reserva, el proveedor recibirá una solicitud que deberá aprobar.
        </p>
      </div>
    </div>
  );
};

export default BookingSummary;
