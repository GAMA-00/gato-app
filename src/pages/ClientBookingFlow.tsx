
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
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
      <div className="max-w-2xl mx-auto space-y-8 p-8 bg-white rounded-2xl shadow-soft border border-gray-100">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Configuremos tu servicio
          </h2>
          <p className="text-gray-600">
            Selecciona la frecuencia que mejor se adapte a tus necesidades
          </p>
        </div>
        
        <div className="space-y-8">
          <div className="space-y-4">
            <Label className="text-lg font-medium text-gray-900 block text-center">
              ¿Con qué frecuencia necesitas este servicio? <span className="text-red-500">*</span>
            </Label>
            <Tabs 
              value={bookingPrefs.frequency} 
              onValueChange={handleFrequencyChange}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 gap-2 w-full h-auto p-2 bg-gray-50 rounded-xl">
                <TabsTrigger 
                  value="once" 
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Una vez
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Semanal
                </TabsTrigger>
                <TabsTrigger 
                  value="biweekly"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Quincenal
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly"
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm py-3 px-4 rounded-lg transition-all duration-200"
                >
                  Mensual
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {!bookingPrefs.frequency && (
              <p className="text-sm text-red-500 text-center animate-pulse">
                Debes seleccionar una frecuencia para continuar
              </p>
            )}
          </div>
          
          {isRecurringBooking && (
            <div className="space-y-6 p-6 bg-blue-50/50 rounded-xl border border-blue-100 animate-fade-in">
              <div className="space-y-4">
                <Label className="text-lg font-medium text-gray-900 block text-center">
                  ¿Qué días prefieres? <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-gray-600 text-center">
                  Selecciona los días de la semana que mejor te convengan
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {dayNames.map((day, index) => (
                    <Button
                      key={day}
                      type="button"
                      variant={bookingPrefs.selectedDays?.includes(index + 1) ? 'default' : 'outline'}
                      onClick={() => handleDayChange(index + 1)}
                      className={`h-12 text-sm font-medium transition-all duration-200 ${
                        bookingPrefs.selectedDays?.includes(index + 1) 
                          ? 'bg-primary hover:bg-primary/90 text-white shadow-sm' 
                          : 'bg-white hover:bg-gray-50 border-gray-200'
                      }`}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
                {isRecurringBooking && (!bookingPrefs.selectedDays || bookingPrefs.selectedDays.length === 0) && (
                  <p className="text-sm text-red-500 text-center animate-pulse">
                    Debes seleccionar al menos un día para continuar
                  </p>
                )}
              </div>
              
              {/* Recurring booking summary */}
              {bookingPrefs.selectedDays && bookingPrefs.selectedDays.length > 0 && (
                <div className="p-4 bg-white rounded-lg border border-blue-200 animate-scale-in">
                  <h4 className="font-medium text-blue-900 mb-3 text-center">
                    📅 Resumen de tu reserva recurrente
                  </h4>
                  <div className="space-y-2 text-sm text-blue-800">
                    <div className="flex justify-between">
                      <span>Frecuencia:</span>
                      <span className="font-medium">
                        {bookingPrefs.frequency === 'weekly' ? 'Cada semana' :
                         bookingPrefs.frequency === 'biweekly' ? 'Cada 2 semanas' :
                         'Cada mes'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Días:</span>
                      <span className="font-medium">
                        {bookingPrefs.selectedDays.map(day => dayNames[day - 1]).join(', ')}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-blue-100">
                      <p className="text-xs text-blue-700 italic text-center">
                        Los horarios se reservarán automáticamente según este patrón
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="pt-6 border-t border-gray-100">
          <Button 
            onClick={handleShowResults} 
            disabled={!canContinue}
            className={`w-full h-14 text-lg font-medium rounded-xl transition-all duration-200 ${
              canContinue 
                ? 'bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <span>Ver profesionales disponibles</span>
            <ArrowRight className="ml-3 h-5 w-5" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBookingFlow;
