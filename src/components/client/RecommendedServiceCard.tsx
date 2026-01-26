import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { RecommendedListing } from '@/hooks/useRecommendedListings';
import { cn } from '@/lib/utils';
import { 
  homeServiceImages, 
  classesServiceImages, 
  personalCareServiceImages,
  sportsServiceImages,
  petsServiceImages,
  otherServiceImages 
} from '@/constants/serviceImages';

// Helper function to get fallback image from service type name
const getServiceTypeFallbackImage = (serviceTypeName: string | undefined): string | null => {
  if (!serviceTypeName) return null;
  
  const name = serviceTypeName.toLowerCase();
  
  const allServiceImages: Record<string, string> = {
    ...homeServiceImages,
    ...classesServiceImages,
    ...personalCareServiceImages,
    ...sportsServiceImages,
    ...petsServiceImages,
    ...otherServiceImages,
  };
  
  // Exact match first
  if (allServiceImages[name]) return allServiceImages[name];
  
  // Partial match - check if service name contains any key or vice versa
  for (const [key, value] of Object.entries(allServiceImages)) {
    if (name.includes(key) || key.includes(name)) {
      return value;
    }
  }
  
  return null;
};

interface RecommendedServiceCardProps {
  listing: RecommendedListing;
  className?: string;
}

const RecommendedServiceCard = ({ listing, className }: RecommendedServiceCardProps) => {
  const navigate = useNavigate();
  
  // Get first gallery image, fallback to service type icon, or use placeholder
  const fallbackImage = getServiceTypeFallbackImage(listing.service_type?.name);
  const imageUrl = listing.gallery_images?.[0] || fallbackImage || '/placeholder.svg';
  const providerName = listing.provider?.name || 'Proveedor';
  const rating = listing.provider?.average_rating || 5.0;

  const handleClick = () => {
    const providerId = listing.provider?.id;
    if (providerId) {
      navigate(`/client/service/${providerId}/${listing.id}`);
    }
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
