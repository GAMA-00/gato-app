
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CalendarDays, Clock, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingPreferences } from '@/components/client/results/types';

const ClientBookingFlow = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  
  console.log("ClientBookingFlow rendered with params:", { categoryName, serviceId });
  
  // Estado para preferencias de reserva
  const [bookingPrefs, setBookingPrefs] = useState<BookingPreferences>({
    frequency: '', // Hacer obligatoria la selección
    selectedDays: [],
    timeSlot: '6am-12md',
  });
  
  // Obtener información del servicio
  const { data: serviceInfo, isLoading } = useQuery({
    queryKey: ['service-info', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*, category:category_id(name, label)')
        .eq('id', serviceId)
        .single();
        
      if (error) {
        console.error("Error fetching service info:", error);
        throw error;
      }
      
      console.log("Service info fetched:", data);
      return data;
    },
    enabled: !!serviceId
  });
  
  const handleFrequencyChange = (value: string) => {
    setBookingPrefs(prev => ({ 
      ...prev, 
      frequency: value,
      selectedDays: value === 'once' ? [] : prev.selectedDays // Clear days for one-time bookings
    }));
  };
  
  const handleDayChange = (day: number) => {
    setBookingPrefs(prev => {
      const selectedDays = prev.selectedDays || [];
      if (selectedDays.includes(day)) {
        return { ...prev, selectedDays: selectedDays.filter(d => d !== day) };
      } else {
        return { ...prev, selectedDays: [...selectedDays, day] };
      }
    });
  };
  
  const handleTimeSlotChange = (value: string) => {
    setBookingPrefs(prev => ({ ...prev, timeSlot: value }));
  };
  
  const handleBack = () => {
    navigate(`/client/category/${categoryName}`);
  };
  
  const handleShowResults = () => {
    // Validar que se haya seleccionado la frecuencia
    if (!bookingPrefs.frequency) {
      return; // El botón estará deshabilitado pero por si acaso
    }
    
    // Validar que para reservas recurrentes se hayan seleccionado días
    if (bookingPrefs.frequency !== 'once' && (!bookingPrefs.selectedDays || bookingPrefs.selectedDays.length === 0)) {
      return; // El botón estará deshabilitado pero por si acaso
    }
    
    console.log("Navigating to results with params:", { categoryName, serviceId });
    console.log("Booking preferences:", bookingPrefs);
    navigate(`/client/results/${categoryName}/${serviceId}`, { state: bookingPrefs });
  };
  
  // Nombres de los días de la semana
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Verificar si se puede continuar
  const canContinue = bookingPrefs.frequency && 
    (bookingPrefs.frequency === 'once' || 
     (bookingPrefs.selectedDays && bookingPrefs.selectedDays.length > 0));
  
  const isRecurringBooking = bookingPrefs.frequency && bookingPrefs.frequency !== 'once';
  
  return (
    <PageContainer
      title={serviceInfo?.name || 'Detalles de reserva'}
      subtitle={
        <Button 
          variant="outline" 
          onClick={handleBack} 
          className="px-4 py-2 h-auto border-luxury-navy/10 text-luxury-navy hover:bg-luxury-beige/50 hover:text-luxury-navy"
        >
          <ArrowLeft size={16} className="mr-2" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-xl shadow-sm border">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
            Preferencias de agendamiento
          </h2>
          
          {/* Alert explaining recurring booking system */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Para reservas recurrentes, el sistema verificará que el horario elegido 
              esté disponible de forma continua en todas las fechas futuras según el patrón seleccionado.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">
                ¿Con qué frecuencia necesitas este servicio? <span className="text-red-500">*</span>
              </Label>
              <Tabs 
                value={bookingPrefs.frequency} 
                onValueChange={handleFrequencyChange}
                className="mt-2"
              >
                <TabsList className="grid grid-cols-4 gap-2 w-full">
                  <TabsTrigger value="once">Una vez</TabsTrigger>
                  <TabsTrigger value="weekly">Semanal</TabsTrigger>
                  <TabsTrigger value="biweekly">Quincenal</TabsTrigger>
                  <TabsTrigger value="monthly">Mensual</TabsTrigger>
                </TabsList>
              </Tabs>
              {!bookingPrefs.frequency && (
                <p className="text-sm text-red-500 mt-1">Debes seleccionar una frecuencia para continuar</p>
              )}
            </div>
            
            {isRecurringBooking && (
              <div>
                <Label className="text-base font-medium">
                  ¿Qué días prefieres? <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Solo se mostrarán horarios que estén libres en estos días para todas las fechas futuras
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {dayNames.map((day, index) => (
                    <Button
                      key={day}
                      type="button"
                      variant={bookingPrefs.selectedDays?.includes(index + 1) ? 'default' : 'outline'}
                      onClick={() => handleDayChange(index + 1)}
                      className="h-10"
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                {isRecurringBooking && (!bookingPrefs.selectedDays || bookingPrefs.selectedDays.length === 0) && (
                  <p className="text-sm text-red-500 mt-1">Debes seleccionar al menos un día para continuar</p>
                )}
              </div>
            )}
            
            <div>
              <Label className="text-base">¿En qué horario prefieres?</Label>
              <Select value={bookingPrefs.timeSlot} onValueChange={handleTimeSlotChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6am-12md">Mañana (6am - 12md)</SelectItem>
                  <SelectItem value="1pm-5pm">Tarde (1pm - 5pm)</SelectItem>
                  <SelectItem value="6pm-9pm">Noche (6pm - 9pm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Recurring booking explanation */}
            {isRecurringBooking && bookingPrefs.selectedDays && bookingPrefs.selectedDays.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Reserva recurrente configurada:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Frecuencia: {
                    bookingPrefs.frequency === 'weekly' ? 'Cada semana' :
                    bookingPrefs.frequency === 'biweekly' ? 'Cada 2 semanas' :
                    'Cada mes'
                  }</li>
                  <li>• Días: {bookingPrefs.selectedDays.map(day => dayNames[day - 1]).join(', ')}</li>
                  <li>• Los horarios se reservarán automáticamente para todas las fechas futuras</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button 
            onClick={handleShowResults} 
            disabled={!canContinue}
            className="flex items-center"
          >
            <span>Ver profesionales disponibles</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBookingFlow;
