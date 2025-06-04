
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DateTimeSelector from '@/components/client/booking/DateTimeSelector';
import RecurrenceSelector from '@/components/client/booking/RecurrenceSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface BookingData {
  providerId: string;
  listingId: string;
  serviceName: string;
  providerName: string;
  price: number;
  duration: number;
  notes?: string;
  recurrence?: string;
}

const ClientBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const bookingData = location.state as BookingData;
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [selectedFrequency, setSelectedFrequency] = useState<string>('once');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    console.log("ClientBooking mounted with booking data:", bookingData);
  }, [bookingData]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor selecciona una fecha y hora");
      return;
    }

    if (!bookingData) {
      toast.error("Error: No se encontraron datos del servicio");
      return;
    }

    // Calculate end time based on duration
    const startDateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    startDateTime.setHours(hours, minutes, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + bookingData.duration);
    
    const endTime = `${endDateTime.getHours().toString().padStart(2, '0')}:${endDateTime.getMinutes().toString().padStart(2, '0')}`;

    console.log("Navigating to booking summary with data:", {
      providerId: bookingData.providerId,
      listingId: bookingData.listingId,
      date: selectedDate,
      startTime: selectedTime,
      endTime: endTime,
      price: bookingData.price,
      serviceName: bookingData.serviceName,
      providerName: bookingData.providerName,
      notes: notes,
      recurrence: selectedFrequency
    });

    navigate('/client/booking-summary', {
      state: {
        providerId: bookingData.providerId,
        listingId: bookingData.listingId,
        date: selectedDate,
        startTime: selectedTime,
        endTime: endTime,
        price: bookingData.price,
        serviceName: bookingData.serviceName,
        providerName: bookingData.providerName,
        notes: notes,
        recurrence: selectedFrequency
      }
    });
  };

  if (!user) {
    return (
      <PageContainer title="Acceso requerido">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Debes iniciar sesión para agendar un servicio.</p>
          <Button onClick={() => navigate('/login')}>Iniciar sesión</Button>
        </div>
      </PageContainer>
    );
  }

  if (!bookingData) {
    return (
      <PageContainer title="Reserva de Servicio" subtitle="Servicio no encontrado">
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">No se encontraron datos del servicio seleccionado.</p>
          <Button onClick={() => navigate('/client')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a servicios
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Agenda tu servicio"
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Service Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen del servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="font-medium">Servicio:</span> {bookingData.serviceName}</p>
              <p><span className="font-medium">Proveedor:</span> {bookingData.providerName}</p>
              <p><span className="font-medium">Duración:</span> {bookingData.duration} minutos</p>
              <p><span className="font-medium">Precio:</span> ${bookingData.price.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Recurrence Selection */}
        <RecurrenceSelector 
          selectedFrequency={selectedFrequency}
          onFrequencyChange={setSelectedFrequency}
        />

        {/* Date and Time Selection */}
        <DateTimeSelector
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onDateChange={setSelectedDate}
          onTimeChange={setSelectedTime}
          providerId={bookingData.providerId}
          serviceDuration={bookingData.duration}
          selectedFrequency={selectedFrequency}
        />

        {/* Notes Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-base font-medium">
                Notas adicionales (opcional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Agrega cualquier información adicional para el proveedor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedDate || !selectedTime}
            className="flex-1"
          >
            Continuar
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBooking;
