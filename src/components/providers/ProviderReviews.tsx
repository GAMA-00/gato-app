
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
        <CardTitle>Comentarios de clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasMoreComments && (
            <div className="flex justify-end">
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
            </div>
          )}
          
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
