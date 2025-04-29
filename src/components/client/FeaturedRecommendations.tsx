
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDown, Sparkles, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  type: 'featured' | 'new' | 'trending';
}

interface FeaturedRecommendationsProps {
  recommendations: Recommendation[];
  onViewAllClick: () => void;
}

const FeaturedRecommendations: React.FC<FeaturedRecommendationsProps> = ({ 
  recommendations,
  onViewAllClick 
}) => {
  // Si no hay recomendaciones, mostramos datos de ejemplo
  const displayRecommendations = recommendations.length > 0 
    ? recommendations 
    : [
        {
          id: '1',
          title: 'Limpieza de Primavera',
          description: 'Renueva tu hogar con nuestro servicio premium de limpieza completa',
          type: 'featured'
        },
        {
          id: '2',
          title: 'Cuidado de Mascotas',
          description: 'Nuevo servicio de paseo y cuidado para tus mascotas',
          type: 'new'
        },
        {
          id: '3',
          title: 'Clases de Yoga',
          description: 'Nuestras clases de yoga son tendencia este mes',
          type: 'trending'
        }
      ];

  const getIconForType = (type: string) => {
    switch (type) {
      case 'featured':
        return <Star className="h-4 w-4 text-gold-500" />;
      case 'new':
        return <Sparkles className="h-4 w-4 text-indigo-500" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return <Star className="h-4 w-4 text-gold-500" />;
    }
  };

  const getColorForType = (type: string) => {
    switch (type) {
      case 'featured':
        return 'bg-gold-50 border-l-gold-400 hover:border-gold-500';
      case 'new':
        return 'bg-indigo-50 border-l-indigo-400 hover:border-indigo-500';
      case 'trending':
        return 'bg-purple-50 border-l-purple-400 hover:border-purple-500';
      default:
        return 'bg-gold-50 border-l-gold-400 hover:border-gold-500';
    }
  };

  return (
    <div className="mb-8 relative">
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl shadow-luxury border border-purple-100/30 mb-6">
        <h3 className="text-xl font-medium mb-3 text-navy flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-gold-500" />
          Descubre nuestros servicios exclusivos
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {displayRecommendations.map((rec) => (
            <Card 
              key={rec.id}
              className={cn(
                "overflow-hidden border-l-4 transition-all hover:shadow-luxury cursor-pointer", 
                getColorForType(rec.type)
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <h4 className="font-medium text-navy">{rec.title}</h4>
                  {getIconForType(rec.type)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{rec.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-center mt-6">
          <Button 
            onClick={onViewAllClick}
            className="group flex items-center gap-2 bg-gradient-blue-purple hover:bg-indigo-600 text-white font-medium shadow-luxury"
          >
            Ver todos los servicios
            <ArrowDown className="h-4 w-4 transition-transform group-hover:animate-bounce" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeaturedRecommendations;
