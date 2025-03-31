
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DollarSign, InfoIcon } from 'lucide-react';

interface ProviderRateSettingsProps {
  initialRate?: number;
  onSave: (rate: number) => void;
}

const ProviderRateSettings: React.FC<ProviderRateSettingsProps> = ({
  initialRate = 0,
  onSave
}) => {
  const [rate, setRate] = useState(initialRate);

  const handleSave = () => {
    if (rate <= 0) {
      toast.error('La tarifa debe ser mayor que cero');
      return;
    }
    onSave(rate);
    toast.success('Tarifa base actualizada exitosamente');
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Establecer Tarifa Base
        </CardTitle>
        <CardDescription>
          Define tu tarifa base por hora para tus servicios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="base-rate" className="block text-sm font-medium mb-2">
              Tu tarifa por hora ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="base-rate"
                type="number"
                min="1"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="pl-7"
              />
            </div>
          </div>
          <Button onClick={handleSave}>
            Guardar Tarifa
          </Button>
        </div>
        
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <InfoIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium">Información importante sobre precios</p>
              <p className="text-muted-foreground">
                La tarifa que estableces será exactamente el ingreso que recibes por hora de servicio. 
                Como plataforma, cobramos un 20% adicional al cliente que aparecerá en el listado de servicios.
              </p>
              <p className="text-xs text-muted-foreground">
                Ejemplo: Si estableces $100/hora como tu tarifa, el cliente verá $120/hora en el listado.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderRateSettings;
