
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProviderProfile } from '@/lib/types';

interface ProviderReviewsProps {
  provider: ProviderProfile;
}

const ProviderReviews = ({ provider }: ProviderReviewsProps) => {
  // Categorías de valoración
  const ratingCategories = [
    { name: 'Servicio', value: provider.detailedRatings.service },
    { name: 'Calidad/Precio', value: provider.detailedRatings.valueForMoney },
    { name: 'Amabilidad', value: provider.detailedRatings.friendliness },
    { name: 'Materiales', value: provider.detailedRatings.materials },
    { name: 'Profesionalidad', value: provider.detailedRatings.professionalism },
    { name: 'Puntualidad', value: provider.detailedRatings.punctuality }
  ];
  
  // Obtener reviews, si no hay, crear algunas de muestra
  const reviews = provider.reviews.length > 0 ? provider.reviews : [
    {
      id: '1',
      clientName: 'María López',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      rating: 4.8,
      comment: 'Excelente servicio, muy puntual y profesional. Mi perro quedó perfecto.'
    },
    {
      id: '2',
      clientName: 'Juan Ramírez',
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      rating: 4.5,
      comment: 'Muy buen trato con mi mascota, se notaba que tiene experiencia. Repetiré.'
    },
    {
      id: '3',
      clientName: 'Ana Martínez',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      rating: 4.0,
      comment: 'El servicio fue bueno aunque llegó un poco tarde. El resultado final muy bien.'
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Valoraciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Valoración general */}
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="text-3xl font-bold">{provider.rating.toFixed(1)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {provider.ratingCount} valoraciones
            </p>
          </div>
          
          <div className="flex-1 space-y-2">
            {ratingCategories.map((category, index) => (
              <div key={index} className="flex items-center gap-2">
                <p className="text-sm w-28">{category.name}</p>
                <Progress value={category.value * 20} className="h-2" />
                <span className="text-sm font-medium w-6">
                  {category.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Comentarios recientes */}
        <div className="space-y-6">
          <h4 className="font-semibold">Comentarios recientes</h4>
          
          {reviews.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="mx-auto h-12 w-12 opacity-20 mb-2" />
              <p>Aún no hay valoraciones para este proveedor.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review, index) => (
                <div key={review.id} className="space-y-2">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {review.clientName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">{review.clientName}</h5>
                        <span className="text-sm text-muted-foreground">
                          {format(review.date, 'dd MMMM, yyyy', { locale: es })}
                        </span>
                      </div>
                      
                      <div className="flex items-center mt-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                        <span className="font-medium">{review.rating.toFixed(1)}</span>
                      </div>
                      
                      <p className="text-muted-foreground">{review.comment}</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <button className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          <span>Útil</span>
                        </button>
                        
                        <button className="flex items-center text-sm text-muted-foreground hover:text-foreground">
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          <span>No útil</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {index < reviews.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderReviews;
