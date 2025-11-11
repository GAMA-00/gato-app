
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Percent } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface CommissionSettingsProps {
  currentRate: number;
  onUpdate: (newRate: number) => Promise<void>;
}

const CommissionSettings: React.FC<CommissionSettingsProps> = ({
  currentRate,
  onUpdate,
}) => {
  const [rate, setRate] = useState(currentRate);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (rate < 0 || rate > 100) {
      toast.error('La comisión debe estar entre 0% y 100%');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ commission_rate: rate })
        .eq('id', '1');

      if (error) throw error;

      await onUpdate(rate);
      toast.success('Tasa de comisión actualizada exitosamente');
    } catch (error) {
      logger.error('Error updating commission rate:', error);
      toast.error('Error al actualizar la tasa de comisión');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Configuración de Comisión
        </CardTitle>
        <CardDescription>
          Establece el porcentaje de comisión para todos los servicios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="commission-rate" className="block text-sm font-medium mb-2">
              Tasa de comisión (%)
            </label>
            <Input
              id="commission-rate"
              type="number"
              min="0"
              max="100"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
          <Button 
            onClick={handleUpdate}
            disabled={isUpdating || rate === currentRate}
          >
            Actualizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionSettings;
