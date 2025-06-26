
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface PostPaymentBadgeProps {
  className?: string;
}

const PostPaymentBadge: React.FC<PostPaymentBadgeProps> = ({ className = '' }) => {
  return (
    <Badge 
      variant="outline" 
      className={`bg-orange-50 text-orange-700 border-orange-200 ${className}`}
    >
      <Clock className="w-3 h-3 mr-1" />
      Post-pago
    </Badge>
  );
};

export default PostPaymentBadge;
