
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
  date: Date;
  startTime: string;
  endTime: string;
  price: number;
  serviceName: string;
  providerName: string;
  notes?: string;
  recurrence?: string;
  recurrenceEndDate?: Date;
}

const BookingSummary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isBooking, setIsBooking] = useState(false);

  const bookingData = location.state as BookingData;

  console.log("BookingSummary - Booking data:", bookingData);
  console.log("BookingSummary - Current user:", user);

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

  const handleConfirmBooking = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para reservar");
      return;
    }

    setIsBooking(true);
    console.log("Starting booking process for user:", user.id);

    try {
      // Build location string for the appointment
      const locationParts = [];
      
      if (user.residencia_id) {
        // Try to get residencia name
        const { data: residenciaData } = await supabase
          .from('residencias')
          .select('name')
          .eq('id', user.residencia_id)
          .single();
        
        if (residenciaData) {
          locationParts.push(residenciaData.name);
        }
      }
      
      if (user.condominium_text) {
        locationParts.push(user.condominium_text);
      }
      
      if (user.house_number) {
        locationParts.push(`Casa ${user.house_number}`);
      }
      
      const clientLocation = locationParts.length > 0 
        ? locationParts.join(' – ') 
        : 'Ubicación no especificada';

      // Calculate start and end times
      const startDateTime = new Date(bookingData.date);
      const [startHours, startMinutes] = bookingData.startTime.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(bookingData.date);
      const [endHours, endMinutes] = bookingData.endTime.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      console.log("Creating appointment with:", {
        listing_id: bookingData.listingId,
        provider_id: bookingData.providerId,
        client_id: user.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'pending', // Changed to pending so it appears in provider's requests
        notes: bookingData.notes || null,
        recurrence: bookingData.recurrence || 'none',
        client_location: clientLocation
      });

      // Create the appointment with pending status
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          listing_id: bookingData.listingId,
          provider_id: bookingData.providerId,
          client_id: user.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'pending', // This ensures it appears in provider's pending requests
          notes: bookingData.notes || null,
          recurrence: bookingData.recurrence || 'none'
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating appointment:", error);
        throw error;
      }

      console.log("Appointment created successfully:", appointment);

      // Handle recurring appointments if specified
      if (bookingData.recurrence && bookingData.recurrence !== 'none' && bookingData.recurrenceEndDate) {
        console.log("Creating recurring rule for appointment:", appointment.id);
        
        // Create recurring rule
        const { data: recurringRule, error: recurringError } = await supabase
          .from('recurring_rules')
          .insert({
            listing_id: bookingData.listingId,
            provider_id: bookingData.providerId,
            client_id: user.id,
            recurrence_type: bookingData.recurrence,
            start_date: bookingData.date.toISOString().split('T')[0],
            start_time: bookingData.startTime,
            end_time: bookingData.endTime,
            day_of_week: bookingData.recurrence === 'weekly' || bookingData.recurrence === 'biweekly' 
              ? bookingData.date.getDay() : null,
            day_of_month: bookingData.recurrence === 'monthly' 
              ? bookingData.date.getDate() : null,
            notes: bookingData.notes
          })
          .select()
          .single();

        if (recurringError) {
          console.error("Error creating recurring rule:", recurringError);
          // Don't throw here, the main appointment was created successfully
        } else {
          console.log("Recurring rule created:", recurringRule);
          
          // Update the appointment with the recurring rule ID
          await supabase
            .from('appointments')
            .update({ 
              recurring_rule_id: recurringRule.id,
              recurrence_group_id: recurringRule.id
            })
            .eq('id', appointment.id);
        }
      }

      toast.success("¡Reserva solicitada exitosamente!");
      
      // Invalidate all related queries to ensure UI updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-requests'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] }),
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] })
      ]);

      // Navigate to client bookings
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
            <span>{format(bookingData.date, 'PPP', { locale: es })}</span>
          </div>

          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{bookingData.startTime} - {bookingData.endTime}</span>
          </div>

          {user.residencia_id || user.condominium_text || user.house_number ? (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <div>
                {user.residencia_id && <span>Residencia registrada</span>}
                {user.condominium_text && <span> - {user.condominium_text}</span>}
                {user.house_number && <span> - Casa {user.house_number}</span>}
              </div>
            </div>
          ) : (
            <div className="flex items-center text-sm">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">Ubicación no especificada</span>
            </div>
          )}

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
