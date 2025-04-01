
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, TrendingUp, Star } from 'lucide-react';

const QuickStats: React.FC = () => {
  return (
    <Card className="glassmorphism mt-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl">
          Estadísticas Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Award className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Estás en el top 3 de masajistas en esta torre este mes.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Limpieza es el servicio con mas demanda de esta torre.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">La calificación y precio promedio en tu servicio es 4.8 estrellas y $85.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStats;
