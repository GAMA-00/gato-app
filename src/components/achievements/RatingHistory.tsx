
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, User, Calendar, DollarSign } from 'lucide-react';
import { RatingHistory } from '@/lib/achievementTypes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RatingHistoryProps {
  ratingHistory: RatingHistory[];
  isLoading?: boolean;
}

const RatingHistoryComponent = ({ ratingHistory, isLoading }: RatingHistoryProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Historial de Calificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ratingHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Historial de Calificaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aún no tienes calificaciones.</p>
            <p className="text-sm">Completa tu primer trabajo para recibir tu primera calificación.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Historial de Calificaciones
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {ratingHistory.length} {ratingHistory.length === 1 ? 'calificación' : 'calificaciones'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {ratingHistory.map((rating) => (
            <div
              key={rating.id}
              className="border rounded-lg p-4 bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{rating.clientName}</span>
                </div>
                {renderStars(rating.rating)}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(rating.appointmentDate, "d 'de' MMMM, yyyy", { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>${rating.servicePrice.toLocaleString()}</span>
                </div>
              </div>
              
              {rating.serviceName && (
                <div className="mt-2 text-sm text-muted-foreground">
                  <strong>Servicio:</strong> {rating.serviceName}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RatingHistoryComponent;
