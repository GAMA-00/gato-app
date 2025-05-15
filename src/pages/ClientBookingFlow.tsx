
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookingPreferences } from '@/components/client/results/types';

const ClientBookingFlow = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  
  console.log("ClientBookingFlow rendered with params:", { categoryName, serviceId });
  
  // Estado para preferencias de reserva
  const [bookingPrefs, setBookingPrefs] = useState<BookingPreferences>({
    frequency: 'once',
    selectedDays: [],
    timeSlot: '9am-12pm',
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
    setBookingPrefs(prev => ({ ...prev, frequency: value }));
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
    // Navegar a la vista de resultados con los parámetros de búsqueda
    console.log("Navigating to results with params:", { categoryName, serviceId });
    console.log("Booking preferences:", bookingPrefs);
    navigate(`/client/results/${categoryName}/${serviceId}`, { state: bookingPrefs });
  };
  
  // Nombres de los días de la semana
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  return (
    <PageContainer
      title={serviceInfo?.name || 'Detalles de reserva'}
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
      <div className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-xl shadow-sm border">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
            Preferencias de agendamiento
          </h2>
          
          <div className="space-y-4">
            <div>
              <Label className="text-base">¿Con qué frecuencia necesitas este servicio?</Label>
              <Tabs 
                defaultValue="once" 
                value={bookingPrefs.frequency} 
                onValueChange={handleFrequencyChange}
                className="mt-2"
              >
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="once">Una vez</TabsTrigger>
                  <TabsTrigger value="weekly">Semanal</TabsTrigger>
                  <TabsTrigger value="biweekly">Quincenal</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {bookingPrefs.frequency !== 'once' && (
              <div>
                <Label className="text-base">¿Qué días prefieres?</Label>
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
              </div>
            )}
            
            <div>
              <Label className="text-base">¿En qué horario prefieres?</Label>
              <Select value={bookingPrefs.timeSlot} onValueChange={handleTimeSlotChange}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un horario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9am-12pm">Mañana (9am - 12pm)</SelectItem>
                  <SelectItem value="12pm-3pm">Mediodía (12pm - 3pm)</SelectItem>
                  <SelectItem value="3pm-6pm">Tarde (3pm - 6pm)</SelectItem>
                  <SelectItem value="6pm-9pm">Noche (6pm - 9pm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleShowResults} className="flex items-center">
            <span>Ver profesionales disponibles</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBookingFlow;
