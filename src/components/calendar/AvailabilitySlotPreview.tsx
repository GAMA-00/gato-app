import React, { useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';
import { useProviderListing } from '@/hooks/useProviderListing';
import SlotCard from '../services/steps/SlotCard';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, XCircle, Calendar, Clock, Loader2 } from 'lucide-react';

interface AvailabilitySlotPreviewProps {
  availability: any;
  serviceDuration?: number;
}

const AvailabilitySlotPreview: React.FC<AvailabilitySlotPreviewProps> = ({ 
  availability, 
  serviceDuration = 60 
}) => {
  // Get provider's first listing ID for persistence
  const { firstListingId, isLoading: isLoadingListing } = useProviderListing();

  // Memoize availability config to prevent infinite re-renders
  const availabilityConfig = useMemo(() => ({
    availability,
    serviceDuration,
    daysAhead: 7,
    listingId: firstListingId // Now we use real listingId for persistence
  }), [availability, serviceDuration, firstListingId]);

  // Este componente ya no se usa, se reemplazó por ProviderSlotBlockingGrid
  const slots = [];
  const slotsByDate = {};
  const availableDates = [];
  const stats = { totalSlots: 0, availableSlots: 0, blockedSlots: 0, availablePercentage: 0 };
  const isLoading = false;
  const isSaving = false;
  
  // Funciones dummy para evitar errores
  const toggleSlot = () => {};
  const enableAllSlots = () => {};
  const disableAllSlots = () => {};
  const generateSlotsFromAvailability = () => {};

  // Debug logs for tracking state changes
  useEffect(() => {
    console.log('=== AVAILABILITY SLOT PREVIEW DEBUG ===');
    console.log('Total slots in state:', slots.length);
    console.log('Available dates raw:', availableDates.length, availableDates);
    console.log('Slots by date keys:', Object.keys(slotsByDate));
    console.log('Stats:', stats);
    
    Object.entries(slotsByDate).forEach(([date, daySlots]: [string, any]) => {
      console.log(`Date ${date}: ${Array.isArray(daySlots) ? daySlots.length : 0} slots`);
    });
  }, [slots, slotsByDate, availableDates, stats]);

  // Filter and sort available dates using slotsByDate directly to avoid race conditions
  const validAvailableDates = useMemo(() => {
    console.log('=== FILTERING AVAILABLE DATES ===');
    console.log('Input availableDates:', availableDates.length, availableDates);
    console.log('Slots state count:', slots.length);
    console.log('slotsByDate keys:', Object.keys(slotsByDate));
    
    // Get dates directly from slotsByDate keys which are already in correct format
    const dateKeys = Object.keys(slotsByDate);
    console.log('Using slotsByDate keys directly:', dateKeys);
    
    if (dateKeys.length === 0) {
      console.log('No dates in slotsByDate yet');
      return [];
    }
    
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    console.log('Today reference:', todayStr);
    
    // Convert date keys to Date objects and filter (include today and future dates)
    const validDates = dateKeys
      .filter(dateKey => {
        const isValidDate = dateKey >= todayStr; // Compare date strings directly
        console.log(`  Date ${dateKey}: isValidDate=${isValidDate} (today: ${todayStr})`);
        return isValidDate;
      })
      .map(dateKey => new Date(dateKey))
      .sort((a, b) => a.getTime() - b.getTime());
    
    console.log('Valid dates result:', validDates.length, validDates.map(d => format(d, 'yyyy-MM-dd')));
    return validDates;
  }, [slotsByDate]);

  // Generate slots when availability changes
  useEffect(() => {
    const hasAvailability = Object.values(availability || {}).some((day: any) => day?.enabled);
    if (hasAvailability && availability) {
      generateSlotsFromAvailability();
    }
  }, [availability, serviceDuration]); // Only depend on actual data, not the function

  // Don't show if no availability is configured
  const hasAvailability = Object.values(availability).some((day: any) => day?.enabled);
  
  if (!hasAvailability) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="text-center text-yellow-700">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Configure su disponibilidad arriba para ver los horarios generados
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || isLoadingListing) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p className="text-sm">
              {isLoadingListing ? 'Configurando persistencia...' : 'Generando horarios disponibles...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validAvailableDates.length === 0 && !isLoading && !isLoadingListing) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              No se encontraron horarios disponibles con la configuración actual
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-4 px-4 pt-4 md:px-6">
        <div className="text-center md:flex md:items-center md:justify-between md:text-left">
          <div>
            <CardTitle className="text-lg md:text-xl flex items-center justify-center md:justify-start gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="md:hidden">Vista previa</span>
              <span className="hidden md:inline">Vista previa de horarios</span>
            </CardTitle>
            <CardDescription className="hidden md:block mt-2">
              Bloquee o active horarios específicos para los próximos 7 días. Verde = disponible, Rojo = bloqueado.
            </CardDescription>
            <CardDescription className="md:hidden text-center mt-2">
              {stats.availableSlots} de {stats.totalSlots} horarios activos
            </CardDescription>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.availableSlots} disponibles
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              <XCircle className="h-3 w-3 mr-1" />
              {stats.blockedSlots} bloqueados
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 md:px-6">
        {/* Stats Summary - Desktop only */}
        <div className="hidden md:flex justify-between items-center">
          <div className="text-sm text-gray-600">
            <strong>{stats.totalSlots}</strong> horarios generados ({stats.availablePercentage}% disponibles)
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={enableAllSlots}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Activar todos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={disableAllSlots}
              disabled={isSaving}
              className="h-8 text-xs"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Bloquear todos
            </Button>
          </div>
        </div>

        {/* Slots Grid - Mobile optimized with horizontal scroll */}
        <div className="md:grid md:grid-cols-2 lg:grid-cols-7 md:gap-4 md:space-y-0">
          {/* Mobile: Horizontal scroll container for all days */}
          <div className="flex gap-4 overflow-x-auto pb-4 md:hidden">
            {validAvailableDates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDate[dateKey] || [];
              
              return (
                <div key={dateKey} className="flex-shrink-0 w-32 space-y-3">
                  {/* Day Header */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'EEE', { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'd MMM', { locale: es })}
                    </div>
                  </div>

                  {/* Day Slots - Vertical scroll for each day */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4 bg-gray-50 rounded border border-dashed">
                        Sin horarios
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <SlotCard
                          key={slot.id}
                          time={slot.displayTime}
                          period={slot.period}
                          isEnabled={slot.isAvailable}
                           onClick={() => toggleSlot()}
                           size="sm"
                          variant="provider"
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden md:contents">
            {validAvailableDates.map(date => {
              const dateKey = format(date, 'yyyy-MM-dd');
              const daySlots = slotsByDate[dateKey] || [];
              
              return (
                <div key={dateKey} className="space-y-3">
                  {/* Day Header */}
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {format(date, 'EEEE', { locale: es })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(date, 'd MMM', { locale: es })}
                    </div>
                  </div>

                  {/* Day Slots */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {daySlots.length === 0 ? (
                      <div className="text-center text-gray-400 text-xs py-4 bg-gray-50 rounded border border-dashed">
                        Sin horarios
                      </div>
                    ) : (
                      daySlots.map(slot => (
                        <SlotCard
                          key={slot.id}
                          time={slot.displayTime}
                          period={slot.period}
                          isEnabled={slot.isAvailable}
                           onClick={() => toggleSlot()}
                           size="sm"
                          variant="provider"
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilitySlotPreview;