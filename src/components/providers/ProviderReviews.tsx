
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProviderProfile } from '@/lib/types';
import { useProviderComments, useAllProviderComments } from '@/hooks/useProviderComments';

interface ProviderReviewsProps {
  provider: ProviderProfile;
}

const ProviderReviews = ({ provider }: ProviderReviewsProps) => {
  const [showAllComments, setShowAllComments] = useState(false);
  
  // Fetch recent comments (3) and all comments when expanded
  const { data: recentComments, isLoading: isLoadingRecent } = useProviderComments(provider.id, 3);
  const { data: allComments, refetch: fetchAllComments, isLoading: isLoadingAll } = useAllProviderComments(provider.id);

  // Categorías de valoración
  const ratingCategories = [
    { name: 'Servicio', value: provider.detailedRatings.service },
    { name: 'Calidad/Precio', value: provider.detailedRatings.valueForMoney },
    { name: 'Amabilidad', value: provider.detailedRatings.friendliness },
    { name: 'Materiales', value: provider.detailedRatings.materials },
    { name: 'Profesionalidad', value: provider.detailedRatings.professionalism },
    { name: 'Puntualidad', value: provider.detailedRatings.punctuality }
  ];

  const handleToggleComments = async () => {
    if (!showAllComments && !allComments) {
      await fetchAllComments();
    }
    setShowAllComments(!showAllComments);
  };

  // Use appropriate comment set based on current view
  const commentsToShow = showAllComments ? allComments : recentComments;
  const hasMoreComments = recentComments && recentComments.length >= 3;

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
        
        {/* Comentarios de clientes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Comentarios de clientes</h4>
            {hasMoreComments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleComments}
                disabled={isLoadingAll}
                className="text-sm"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver todos
                  </>
                )}
              </Button>
            )}
          </div>
          
          {isLoadingRecent ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="animate-pulse">Cargando comentarios...</div>
            </div>
          ) : !commentsToShow || commentsToShow.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="mx-auto h-8 w-8 opacity-20 mb-2" />
              <p className="text-sm">Aún no hay comentarios para este proveedor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {commentsToShow.map((comment, index) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.client_name?.substring(0, 2).toUpperCase() || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-sm">{comment.client_name}</h5>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), 'dd MMM, yyyy', { locale: es })}
                        </span>
                      </div>
                      
                      <div className="flex items-center mb-2">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < comment.rating 
                                  ? "fill-yellow-400 text-yellow-400" 
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium ml-1">{comment.rating}</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {comment.comment}
                      </p>
                    </div>
                  </div>
                  
                  {index < commentsToShow.length - 1 && <Separator className="mt-3" />}
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
