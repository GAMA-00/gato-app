
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface RatingStarsProps {
  appointmentId: string;
  providerId: string;
  onRated: () => void;
}

export const RatingStars = ({ 
  appointmentId, 
  providerId, 
  onRated 
}: RatingStarsProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const handleRatingSubmit = async () => {
    if (!rating || !user) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .rpc('submit_provider_rating', {
          p_provider_id: providerId,
          p_client_id: user.id,
          p_appointment_id: appointmentId,
          p_rating: rating,
          p_comment: comment.trim() || null
        });
        
      if (error) throw error;
      
      toast.success('¡Gracias por calificar el servicio! Tu calificación ayuda a otros clientes.');
      onRated();
      
      // Force immediate refresh of all provider-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-merits', providerId] }),
        queryClient.invalidateQueries({ queryKey: ['provider-achievements', providerId] }),
        queryClient.invalidateQueries({ queryKey: ['provider-comments', providerId] }),
        queryClient.invalidateQueries({ queryKey: ['providers'] })
      ]);
      
      // Force refetch to ensure immediate update
      await queryClient.refetchQueries({ queryKey: ['provider-merits', providerId] });
      
    } catch (error: any) {
      toast.error(`Error al calificar: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="py-3">
      <p className="text-sm font-medium mb-2">Califica este servicio:</p>
      <div className="flex items-center mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="focus:outline-none"
            disabled={isSubmitting}
          >
            <Star
              className={cn(
                "w-8 h-8 transition-colors",
                (hoveredRating || rating) >= star
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              )}
            />
          </button>
        ))}
      </div>
      
      <div className="mb-3">
        <Textarea
          placeholder="Comparte tu experiencia con este servicio (opcional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="min-h-[80px] resize-none"
          maxLength={500}
          disabled={isSubmitting}
        />
        {comment.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1 text-right">
            {comment.length}/500 caracteres
          </p>
        )}
      </div>
      
      <Button 
        onClick={handleRatingSubmit} 
        disabled={!rating || isSubmitting} 
        size="sm" 
        className="w-full"
      >
        {isSubmitting ? 'Enviando...' : 'Enviar calificación'}
      </Button>
    </div>
  );
};
