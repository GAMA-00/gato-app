import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus, Clock, Save, Loader2, Settings, Calendar, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useProviderAvailability } from '@/hooks/useProviderAvailabilitySettings';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderListing } from '@/hooks/useProviderListing';
import ProviderSlotBlockingGrid from './ProviderSlotBlockingGrid';

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
  const { user } = useAuth();
  const { firstListingId, serviceDuration, isLoading: isLoadingListing } = useProviderListing();
  const {
    availability,
    isLoading,
    isSaving,
    updateDayAvailability,
    addTimeSlot,
    removeTimeSlot,
    updateTimeSlot,
    saveAvailability,
    copyDayToOtherDays
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
    <div className="flex flex-col h-full">
      {/* Fixed Header - Desktop */}
      <div className="hidden md:block flex-shrink-0 mb-4">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="availability" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurar Disponibilidad
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Administrar Horarios
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === 'preview' && (
            <Button 
              onClick={saveAvailability}
              disabled={isSaving}
              size="sm"
              className="flex items-center gap-2 h-9 text-sm px-4 ml-4"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      {/* Fixed Header - Mobile */}
      <div className="md:hidden flex-shrink-0 sticky top-0 z-10 bg-white border-b pb-3 mb-3">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('availability')}
            disabled={activeTab === 'availability'}
            className={`flex items-center gap-1 text-xs px-3 min-h-[40px] ${
              activeTab === 'availability' ? 'bg-background text-foreground' : 'hover:bg-background/80'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline text-xs">Configurar</span>
          </Button>
          
          <div className="flex items-center gap-2 text-sm font-medium text-center flex-1 px-2">
            {activeTab === 'availability' ? (
              <>
                <Settings className="h-4 w-4 text-primary" />
                <span className="truncate">Configurar</span>
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 text-primary" />
                <span className="truncate">Administrar</span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {activeTab === 'preview' && (
              <Button 
                onClick={saveAvailability}
                disabled={isSaving}
                size="sm"
                className="flex items-center gap-1 h-8 text-xs px-3 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                <span className="hidden xs:inline">{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('preview')}
              disabled={activeTab === 'preview'}
              className={`flex items-center gap-1 text-xs px-3 min-h-[40px] ${
                activeTab === 'preview' ? 'bg-background text-foreground' : 'hover:bg-background/80'
              }`}
            >
              <span className="hidden xs:inline text-xs">Administrar</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>


      {/* Content Container - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Availability Configuration Tab */}
        <div className={`${activeTab === 'availability' ? 'block' : 'hidden'}`}>
          <div className="space-y-3 md:space-y-4 pb-4">
            {DAYS.map(({ key, label }) => (
              <Card key={key} className="shadow-sm">
                <CardHeader className="pb-2 md:pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base md:text-lg">{label}</CardTitle>
                      {availability[key]?.enabled && availability[key].timeSlots.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const otherDays = DAYS.filter(d => d.key !== key).map(d => d.key);
                            copyDayToOtherDays(key, otherDays);
                          }}
                          className="h-8 px-2 text-xs"
                          title="Copiar a otros días"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${key}-enabled`}
                        checked={availability[key]?.enabled || false}
                        onCheckedChange={(checked) => updateDayAvailability(key, checked)}
                      />
                      <Label htmlFor={`${key}-enabled`} className="text-sm">Disponible</Label>
                    </div>
                  </div>
                </CardHeader>
                
                {availability[key]?.enabled && (
                  <CardContent className="pt-0 px-3 md:px-6">
                    <div className="space-y-2 md:space-y-3">
                      {availability[key].timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted rounded-lg">
                          <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                            <div>
                              <Label htmlFor={`${key}-start-${index}`} className="text-xs">
                                Hora de inicio
                              </Label>
                              <Input
                                id={`${key}-start-${index}`}
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateTimeSlot(key, index, 'startTime', e.target.value)}
                                className="mt-1 h-8 md:h-10"
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
                                className="mt-1 h-8 md:h-10"
                              />
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTimeSlot(key, index)}
                            className="text-destructive hover:text-destructive-foreground hover:bg-destructive h-8 w-8 md:h-10 md:w-10 flex-shrink-0"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {availability[key].timeSlots.length > 0 && (
                        <div className="flex mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTimeSlot(key)}
                            className="flex-1 h-8 md:h-10 text-xs md:text-sm"
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                            Agregar Horario Adicional
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Slot Management Tab */}
        <div className={`${activeTab === 'preview' ? 'block' : 'hidden'}`}>
          {firstListingId && user?.id ? (
            <ProviderSlotBlockingGrid
              providerId={user.id}
              listingId={firstListingId}
              serviceDuration={serviceDuration}
            />
          ) : (
            <Card className="shadow-md border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                  <p className="text-yellow-800 font-medium">
                    {isLoadingListing ? 'Cargando configuración...' : 'No hay servicios configurados'}
                  </p>
                  <p className="text-yellow-700 text-sm mt-2">
                    Primero debes crear un servicio para poder administrar tus horarios
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};