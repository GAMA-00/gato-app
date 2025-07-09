import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Clock, Save, Loader2, Calendar, Settings } from 'lucide-react';
import { useProviderAvailability } from '@/hooks/useProviderAvailabilitySettings';
import SlotManagementGrid from './SlotManagementGrid';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

export const AvailabilityManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('availability');
  const {
    availability,
    isLoading,
    isSaving,
    updateDayAvailability,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    saveAvailability
  } = useProviderAvailability();

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <div>
              <p className="font-medium">Cargando disponibilidad...</p>
              <p className="text-sm text-muted-foreground">
                Recuperando tu configuración guardada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Administrar Disponibilidad</h2>
          <p className="text-sm text-muted-foreground">
            Configure su disponibilidad y gestione horarios específicos
          </p>
        </div>
        {activeTab === 'availability' && (
          <Button 
            onClick={saveAvailability}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar Disponibilidad
          </TabsTrigger>
          <TabsTrigger value="slots" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gestionar Horarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="availability" className="space-y-4 mt-6">

          <div className="grid gap-4">
            {DAYS.map(({ key, label }) => (
              <Card key={key}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{label}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${key}-enabled`}
                        checked={availability[key]?.enabled || false}
                        onCheckedChange={(checked) => updateDayAvailability(key, checked)}
                      />
                      <Label htmlFor={`${key}-enabled`}>Disponible</Label>
                    </div>
                  </div>
                </CardHeader>
                
                {availability[key]?.enabled && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {availability[key].timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`${key}-start-${index}`} className="text-xs">
                                Hora de inicio
                              </Label>
                              <Input
                                id={`${key}-start-${index}`}
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlot(key, index, 'startTime', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`${key}-end-${index}`} className="text-xs">
                                Hora de fin
                              </Label>
                              <Input
                                id={`${key}-end-${index}`}
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateTimeSlot(key, index, 'endTime', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(key, index)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(key)}
                        className="w-full mt-3"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Horario
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="slots" className="mt-6">
          <SlotManagementGrid 
            config={{
              availability,
              serviceDuration: 60, // Default duration
              daysAhead: 14
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};