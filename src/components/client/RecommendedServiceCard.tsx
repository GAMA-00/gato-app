import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { RecommendedListing } from '@/hooks/useRecommendedListings';
import { cn } from '@/lib/utils';

interface RecommendedServiceCardProps {
  listing: RecommendedListing;
  className?: string;
}

const RecommendedServiceCard = ({ listing, className }: RecommendedServiceCardProps) => {
  const navigate = useNavigate();
  
  // Get first gallery image or use placeholder
  const imageUrl = listing.gallery_images?.[0] || '/placeholder.svg';
  const providerName = listing.provider?.name || 'Proveedor';
  const rating = listing.provider?.average_rating || 5.0;

  const handleClick = () => {
    navigate(`/client/services/${listing.id}`);
  };

  return (
    <div 
      className={cn(
        "flex-shrink-0 w-[150px] cursor-pointer group",
        className
      )}
      onClick={handleClick}
    >
      {/* Image container */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
        <img
          src={imageUrl}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      
      {/* Info */}
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground truncate">
          {providerName}
        </p>
        <p className="text-sm font-medium text-foreground truncate">
          {listing.title}
        </p>
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span className="text-xs text-muted-foreground">
            {rating.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RecommendedServiceCard;
