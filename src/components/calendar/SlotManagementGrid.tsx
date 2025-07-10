import React from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Users, RefreshCw } from 'lucide-react';
import { useProviderSlotManagement } from '@/hooks/useProviderSlotManagement';

interface SlotManagementGridProps {
  providerId: string;
}

export const SlotManagementGrid: React.FC<SlotManagementGridProps> = ({ providerId }) => {
  const { 
    slotsByDate, 
    stats, 
    isLoading, 
    loadProviderSlots,
    toggleSlot 
  } = useProviderSlotManagement();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestión de Horarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Gestión de Horarios
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadProviderSlots}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <Clock className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm text-green-600">Disponibles</p>
              <p className="text-lg font-semibold text-green-700">{stats.availableSlots}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-sm text-blue-600">Reservados</p>
              <p className="text-lg font-semibold text-blue-700">{stats.reservedSlots}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
          <Badge className="bg-green-100 text-green-800">Recurrente</Badge>
          <Badge className="bg-blue-100 text-blue-800">Reservado</Badge>
          <Badge className="bg-green-50 text-green-700">Disponible</Badge>
        </div>

        {Object.keys(slotsByDate).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay horarios configurados</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};