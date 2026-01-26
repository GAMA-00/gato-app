import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryListingCardProps {
  listing: {
    id: string;
    title: string;
    gallery_images: string[] | null;
    provider: {
      name: string | null;
      avatar_url: string | null;
      average_rating: number | null;
    } | null;
  };
  className?: string;
}

const CategoryListingCard = ({ listing, className }: CategoryListingCardProps) => {
  const navigate = useNavigate();
  
  const imageUrl = listing.gallery_images?.[0] || '/placeholder.svg';
  const providerName = listing.provider?.name || 'Proveedor';
  const rating = listing.provider?.average_rating || 5.0;

  const handleClick = () => {
    navigate(`/client/services/${listing.id}`);
  };

  return (
    <div 
      className={cn(
        "cursor-pointer group",
        className
      )}
      onClick={handleClick}
    >
      {/* Image container */}
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-2">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      
      {/* Info */}
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground truncate">
          {providerName}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground truncate flex-1">
            {listing.title}
          </span>
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          <span className="text-xs text-muted-foreground">
            {rating.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CategoryListingCard;
