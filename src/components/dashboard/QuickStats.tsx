
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickStatsProps {
  popularService: string;
  busiestDay: string;
  avgDuration: string;
  satisfaction: number;
}

const QuickStats: React.FC<QuickStatsProps> = ({
  popularService,
  busiestDay,
  avgDuration,
  satisfaction
}) => {
  return (
    <Card className="glassmorphism">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl">
          Estadísticas Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-sm">Servicio Más Popular</p>
            <p className="font-medium">{popularService}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm">Día Más Ocupado</p>
            <p className="font-medium">{busiestDay}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm">Duración Promedio de Cita</p>
            <p className="font-medium">{avgDuration}</p>
          </div>
          
          <div>
            <p className="text-muted-foreground text-sm">Satisfacción del Cliente</p>
            <div className="relative pt-1">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
                <div 
                  style={{ width: `${satisfaction}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                ></div>
              </div>
              <p className="text-xs text-right mt-1">{satisfaction}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStats;
