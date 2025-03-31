
import React from 'react';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Comment {
  id: string;
  clientName: string;
  serviceName: string;
  date: Date;
  rating: number;
  comment: string;
}

interface RatingSectionProps {
  comments: Comment[];
}

const RatingSection: React.FC<RatingSectionProps> = ({ comments }) => {
  // Render a rating stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star 
          key={i} 
          className={`h-4 w-4 ${i < rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
        />
      );
    }
    return <div className="flex">{stars}</div>;
  };

  // Calculate average rating
  const averageRating = (comments.reduce((sum, item) => sum + item.rating, 0) / comments.length).toFixed(1);

  return (
    <Card className="glassmorphism">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xl flex items-center">
          <Star className="mr-2 h-5 w-5 text-primary" />
          Calificaciones
        </CardTitle>
        <div className="flex items-center">
          <span className="text-2xl font-semibold mr-2">{averageRating}</span>
          {renderStars(parseFloat(averageRating))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <h4 className="font-medium">{comment.clientName}</h4>
                  <p className="text-xs text-muted-foreground">{comment.serviceName}</p>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(comment.rating)}
                  <span className="text-xs text-muted-foreground ml-1">
                    {format(comment.date, 'dd/MM/yyyy')}
                  </span>
                </div>
              </div>
              <p className="text-sm mt-1">{comment.comment}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RatingSection;
