
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Clock, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

const MOCK_STATS = {
  rating: 5.0,
  weekAppointments: 12,
  weekAppointmentsChange: 8, // porcentaje incremento/decremento
  weekAppointmentsPositive: true,
  monthRevenue: 10400,
  monthRevenueChange: 5,
  monthRevenuePositive: true
};

const renderStars = (rating: number) => {
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Star 
        key={i} 
        className={`h-4 w-4 ${i < Math.round(rating) ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
      />
    );
  }
  return <div className="flex">{stars}</div>;
};

const QuickStats: React.FC = () => {
  return (
    <Card className="glassmorphism mt-2">
      <CardHeader className="pb-2 space-y-0">
        <CardTitle className="text-xl">Estadísticas Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Calificación promedio */}
          <div className="flex flex-col items-start justify-between bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{MOCK_STATS.rating}</span>
            </div>
            {renderStars(MOCK_STATS.rating)}
            <p className="text-xs text-muted-foreground mt-2">Calificación promedio</p>
          </div>
          
          {/* Citas de la semana */}
          <div className="flex flex-col items-start justify-between bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{MOCK_STATS.weekAppointments}</span>
            </div>
            <div className="flex items-center gap-1">
              {MOCK_STATS.weekAppointmentsPositive ? 
                <TrendingUp className="h-4 w-4 text-green-500" /> : 
                <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <span className={MOCK_STATS.weekAppointmentsPositive ? "text-green-600" : "text-red-600"}>
                {MOCK_STATS.weekAppointmentsPositive ? '+' : '-'}
                {MOCK_STATS.weekAppointmentsChange}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Citas esta semana</p>
          </div>
          
          {/* Ganancias mensuales */}
          <div className="flex flex-col items-start justify-between bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">${MOCK_STATS.monthRevenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              {MOCK_STATS.monthRevenuePositive ? 
                <TrendingUp className="h-4 w-4 text-green-500" /> : 
                <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <span className={MOCK_STATS.monthRevenuePositive ? "text-green-600" : "text-red-600"}>
                {MOCK_STATS.monthRevenuePositive ? '+' : '-'}
                {MOCK_STATS.monthRevenueChange}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Ingresos netos del mes</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickStats;

