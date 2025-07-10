import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Calendar, Clock } from 'lucide-react';
import { useRecurringInstancesManager } from '@/hooks/useRecurringInstancesManager';
import { useAuth } from '@/contexts/AuthContext';

export const RecurringInstancesManager = () => {
  const { user } = useAuth();
  const {
    generateInstances,
    extendInstances,
    isGenerating,
    isExtending,
  } = useRecurringInstancesManager(user?.id);

  if (user?.role !== 'provider') {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Gestor de Citas Recurrentes
        </CardTitle>
        <CardDescription>
          Generar y administrar las instancias de citas recurrentes automáticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => generateInstances(12)}
            disabled={isGenerating}
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4" />
            )}
            {isGenerating ? 'Generando...' : 'Generar Citas (12 semanas)'}
          </Button>

          <Button
            onClick={() => extendInstances()}
            disabled={isExtending}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExtending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            {isExtending ? 'Extendiendo...' : 'Extender Instancias'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>• <strong>Generar Citas:</strong> Crea instancias físicas para las próximas 12 semanas</p>
          <p>• <strong>Extender Instancias:</strong> Añade más instancias futuras a reglas existentes</p>
        </div>
      </CardContent>
    </Card>
  );
};