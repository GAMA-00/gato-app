import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, RotateCcw, Loader2 } from 'lucide-react';
import SlotCard from '@/components/services/steps/SlotCard';
import { useProviderSlotManagement, ProviderSlotConfig } from '@/hooks/useProviderSlotManagement';

interface SlotManagementGridProps {
  config?: ProviderSlotConfig;
  onGenerateSlots?: () => void;
}

const SlotManagementGrid: React.FC<SlotManagementGridProps> = ({ 
  config, 
  onGenerateSlots 
}) => {
  const {
    slots,
    slotsByDate,
    availableDates,
    stats,
    isLoading,
    isSaving,
    generateSlotsFromAvailability,
    toggleSlot,
    enableAllSlots,
    disableAllSlots
  } = useProviderSlotManagement(config);

  const handleGenerateSlots = async () => {
    await generateSlotsFromAvailability();
    onGenerateSlots?.();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Cargando horarios...</span>
        </CardContent>
      </Card>
    );
  }

  if (availableDates.length === 0) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center text-blue-700">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm mb-4">
              No tienes horarios generados. Genera horarios basados en tu disponibilidad.
            </p>
            {config && (
              <Button 
                onClick={handleGenerateSlots}
                disabled={isSaving}
                className="flex items-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Generar Horarios
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Gestión de Horarios</CardTitle>
            <CardDescription>
              Administra la disponibilidad de tus horarios. Los horarios reservados no se pueden modificar.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.availableSlots} disponibles
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Clock className="h-3 w-3 mr-1" />
              {stats.reservedSlots} reservados
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              {stats.disabledSlots} desactivados
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>{stats.totalSlots}</strong> horarios totales
            <span className="ml-2">({stats.availablePercentage}% disponibles)</span>
          </div>
          <div className="flex gap-2">
            {config && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSlots}
                disabled={isSaving}
                className="text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3 mr-1" />
                )}
                Regenerar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllSlots}
              disabled={isSaving}
              className="text-green-700 border-green-200 hover:bg-green-50"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-3 w-3 mr-1" />
              )}
              Activar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllSlots}
              disabled={isSaving}
              className="text-red-700 border-red-200 hover:bg-red-50"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Desactivar todos
            </Button>
          </div>
        </div>

        {/* Slots Grid - Same layout as SlotGeneratorPreview */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {/* Headers - Fixed height for alignment */}
            {availableDates.map(date => (
              <div key={date.toISOString()} className="text-center h-12 flex flex-col justify-center mb-2 bg-slate-50 rounded-md border">
                <div className="text-sm font-medium text-gray-900">
                  {format(date, 'EEEE', { locale: es })}
                </div>
                <div className="text-xs text-gray-500">
                  {format(date, 'd MMM', { locale: es })}
                </div>
              </div>
            ))}
            
            {/* Slots - Symmetric grid with equal column heights */}
            {availableDates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDate[dateKey] || [];
              const maxSlotsPerDay = Math.max(...availableDates.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                return slotsByDate[key]?.length || 0;
              }));
              
              return (
                <div key={dateKey} className="flex flex-col space-y-1 min-h-0">
                  {daySlots.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4 flex-1 flex items-center justify-center bg-gray-50 rounded border border-dashed">
                      Sin horarios
                    </div>
                  ) : (
                    <>
                      {daySlots.map(slot => {
                        const isDisabled = slot.isReserved || isSaving;
                        const variant = slot.isReserved ? 'reserved' : 'provider';
                        
                        return (
                          <SlotCard
                            key={slot.id}
                            time={slot.displayTime}
                            period={slot.period}
                            isEnabled={slot.isAvailable}
                            onClick={() => !isDisabled && toggleSlot(slot.id)}
                            size="sm"
                            variant={variant as any}
                            className={`w-full flex-shrink-0 ${
                              slot.isReserved 
                                ? 'opacity-75 cursor-not-allowed bg-blue-50 text-blue-700 border-blue-200' 
                                : isDisabled 
                                  ? 'opacity-50 cursor-not-allowed' 
                                  : ''
                            }`}
                          />
                        );
                      })}
                      {/* Add empty spacers to maintain grid alignment */}
                      {Array.from({ length: maxSlotsPerDay - daySlots.length }).map((_, i) => (
                        <div key={`spacer-${i}`} className="h-12 opacity-0" />
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-3">
            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Leyenda de horarios:</p>
              <div className="grid grid-cols-2 gap-2 text-blue-700 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                  <span>Disponible</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                  <span>Desactivado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                  <span>Reservado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded border-dashed"></div>
                  <span>Sin horarios</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlotManagementGrid;