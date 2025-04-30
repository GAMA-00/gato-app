import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Calendar, Clock, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface BookingStep {
  id: number;
  name: string;
  completed: boolean;
  current: boolean;
}

const ClientBookingFlow = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [frequency, setFrequency] = useState<string>('once');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [timePreference, setTimePreference] = useState<string>('flexible');
  const [timeSlot, setTimeSlot] = useState<string>('');
  
  // Definición de los pasos del flujo de reserva
  const steps: BookingStep[] = [
    { id: 1, name: 'Frecuencia', completed: currentStep > 1, current: currentStep === 1 },
    { id: 2, name: 'Día', completed: currentStep > 2, current: currentStep === 2 },
    { id: 3, name: 'Duración', completed: currentStep > 3, current: currentStep === 3 },
    { id: 4, name: 'Hora', completed: currentStep > 4, current: currentStep === 4 },
  ];

  // Manejo de la selección de frecuencia
  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
  };

  // Manejo de la selección de días
  const handleDayToggle = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  // Manejo de la duración del servicio
  const handleDurationChange = (value: number[]) => {
    setDuration(value[0]);
  };

  // Manejo de la preferencia de hora
  const handleTimePreferenceChange = (value: string) => {
    setTimePreference(value);
  };

  // Manejo de la selección de franja horaria
  const handleTimeSlotChange = (slot: string) => {
    setTimeSlot(slot);
  };

  // Navegación entre pasos
  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Navegar a la pantalla de resultados/profesionales
      navigate(`/client/results/${categoryName}/${serviceId}`, {
        state: {
          frequency,
          selectedDays,
          duration,
          timePreference,
          timeSlot
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(`/client/category/${categoryName}`);
    }
  };

  // Función para saltar un paso
  const handleSkip = () => {
    handleNext();
  };

  // Renderizado del contenido según el paso actual
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-in">
            <h3 className="text-lg font-medium mb-6">¿Con qué frecuencia necesitas este servicio?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card 
                className={`p-6 cursor-pointer border-2 transition-all ${frequency === 'weekly' ? 'border-luxury-navy shadow-luxury' : 'border-luxury-gray'}`}
                onClick={() => handleFrequencyChange('weekly')}
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-luxury-beige text-luxury-navy mb-2">
                    <Calendar size={20} />
                  </div>
                  <h4 className="font-medium">Cada semana</h4>
                  <p className="text-xs text-center text-muted-foreground mt-1">Servicio semanal recurrente</p>
                </div>
              </Card>

              <Card 
                className={`p-6 cursor-pointer border-2 transition-all ${frequency === 'biweekly' ? 'border-luxury-navy shadow-luxury' : 'border-luxury-gray'}`}
                onClick={() => handleFrequencyChange('biweekly')}
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-luxury-beige text-luxury-navy mb-2">
                    <Calendar size={20} />
                  </div>
                  <h4 className="font-medium">Cada 2 semanas</h4>
                  <p className="text-xs text-center text-muted-foreground mt-1">Servicio quincenal recurrente</p>
                </div>
              </Card>

              <Card 
                className={`p-6 cursor-pointer border-2 transition-all ${frequency === 'once' ? 'border-luxury-navy shadow-luxury' : 'border-luxury-gray'}`}
                onClick={() => handleFrequencyChange('once')}
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-luxury-beige text-luxury-navy mb-2">
                    <Calendar size={20} />
                  </div>
                  <h4 className="font-medium">Una vez</h4>
                  <p className="text-xs text-center text-muted-foreground mt-1">Servicio único sin repetición</p>
                </div>
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="animate-fade-in">
            <h3 className="text-lg font-medium mb-6">¿Qué día prefieres para tu servicio?</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
                <Button
                  key={index}
                  variant={selectedDays.includes(index) ? "default" : "outline"}
                  className={`h-20 ${selectedDays.includes(index) ? 'bg-luxury-navy' : ''}`}
                  onClick={() => handleDayToggle(index)}
                >
                  {day}
                  {selectedDays.includes(index) && <Check size={16} className="ml-1" />}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              {frequency !== 'once' 
                ? 'Selecciona los días para tu servicio recurrente.' 
                : 'Selecciona un día para tu servicio único.'}
            </p>
          </div>
        );

      case 3:
        return (
          <div className="animate-fade-in">
            <h3 className="text-lg font-medium mb-6">¿Cuánto tiempo necesitas para tu servicio?</h3>
            <div className="mb-10">
              <div className="text-center mb-8 text-3xl font-medium text-luxury-navy">
                {duration} minutos
              </div>
              <Slider
                defaultValue={[60]}
                min={30}
                max={180}
                step={15}
                onValueChange={handleDurationChange}
                className="max-w-md mx-auto"
              />
              <div className="flex justify-between max-w-md mx-auto mt-2 text-sm text-muted-foreground">
                <span>30min</span>
                <span>1h</span>
                <span>1h30</span>
                <span>2h</span>
                <span>3h</span>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="animate-fade-in">
            <h3 className="text-lg font-medium mb-6">¿A qué hora prefieres tu servicio?</h3>
            
            <Tabs defaultValue="flexible" onValueChange={handleTimePreferenceChange} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="flexible">Horario flexible</TabsTrigger>
                <TabsTrigger value="exact">Hora exacta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="flexible" className="mt-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {['6-9', '9-12', '12-15', '15-18', '18-21'].map((slot) => (
                    <Button
                      key={slot}
                      variant={timeSlot === slot ? "default" : "outline"}
                      className={timeSlot === slot ? 'bg-luxury-navy' : ''}
                      onClick={() => handleTimeSlotChange(slot)}
                    >
                      {slot}h
                    </Button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="exact" className="mt-6">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 16 }, (_, i) => i + 6).map((hour) => (
                    <Button
                      key={hour}
                      variant={timeSlot === `${hour}:00` ? "default" : "outline"}
                      className={timeSlot === `${hour}:00` ? 'bg-luxury-navy' : ''}
                      onClick={() => handleTimeSlotChange(`${hour}:00`)}
                    >
                      {hour}:00
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <PageContainer
      title="Agenda tu servicio"
      subtitle={`Paso ${currentStep} de ${steps.length}: ${steps.find(s => s.id === currentStep)?.name}`}
    >
      {/* Indicador de progreso */}
      <div className="w-full mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-luxury-navy text-white' : 
                    step.current ? 'border-2 border-luxury-navy text-luxury-navy' : 
                    'bg-luxury-gray text-muted-foreground'
                  }`}
                >
                  {step.completed ? <Check size={18} /> : step.id}
                </div>
                <span className="text-xs mt-1 text-muted-foreground">{step.name}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${index < currentStep - 1 ? 'bg-luxury-navy' : 'bg-luxury-gray'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Contenido del paso actual */}
      <Card className="p-6 mb-6 shadow-luxury bg-luxury-white">
        {renderStepContent()}
      </Card>

      {/* Botones de navegación - Ajustados para mejor visualización en móvil */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-0 mt-8 pb-20 sm:pb-8">
        <Button variant="outline" onClick={handleBack} className="w-full sm:w-auto">
          <ArrowLeft size={16} className="mr-2" />
          Anterior
        </Button>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleSkip} className="w-full sm:w-auto">
            Omitir paso
          </Button>
          
          <Button 
            onClick={handleNext} 
            className="bg-luxury-navy hover:bg-luxury-navy/90 w-full sm:w-auto"
          >
            {currentStep === steps.length ? 'Buscar profesionales' : 'Siguiente'}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBookingFlow;
