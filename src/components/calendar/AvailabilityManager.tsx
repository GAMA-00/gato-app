import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Loader2, Settings, Calendar } from 'lucide-react';
import { useProviderAvailability } from '@/hooks/useProviderAvailabilitySettings';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderListing } from '@/hooks/useProviderListing';
import { useAvailabilitySync } from '@/hooks/useAvailabilitySync';
import { AvailabilityConfigureTab } from './AvailabilityConfigureTab';
import { AvailabilityManageTab } from './AvailabilityManageTab';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export const AvailabilityManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('configurar');
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
  
  useAvailabilitySync();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="font-medium text-foreground">Cargando disponibilidad...</p>
        <p className="text-sm text-muted-foreground">Recuperando tu configuración guardada</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Tabs */}
      <div className="flex-shrink-0 pb-4">
        {/* Pill-shaped Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-full h-12">
            <TabsTrigger 
              value="configurar" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex items-center justify-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </TabsTrigger>
            <TabsTrigger 
              value="administrar" 
              className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex items-center justify-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Administrar
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className={activeTab === 'configurar' ? 'block' : 'hidden'}>
          <AvailabilityConfigureTab
            availability={availability}
            updateDayAvailability={updateDayAvailability}
            addTimeSlot={addTimeSlot}
            removeTimeSlot={removeTimeSlot}
            updateTimeSlot={updateTimeSlot}
            copyDayToOtherDays={copyDayToOtherDays}
          />
        </div>

        <div className={activeTab === 'administrar' ? 'block' : 'hidden'}>
          {firstListingId && user?.id ? (
            <AvailabilityManageTab
              providerId={user.id}
              listingId={firstListingId}
              serviceDuration={serviceDuration}
            />
          ) : (
            <Card className="shadow-sm border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                  <p className="text-amber-800 font-medium">
                    {isLoadingListing ? 'Cargando configuración...' : 'No hay servicios configurados'}
                  </p>
                  <p className="text-amber-700 text-sm mt-2">
                    Primero debes crear un servicio para poder administrar tus horarios
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Save Button */}
      <div className="flex-shrink-0 pt-4 border-t mt-4">
        <Button 
          onClick={saveAvailability}
          disabled={isSaving}
          className="w-full h-12 text-base font-medium"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Guardar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
