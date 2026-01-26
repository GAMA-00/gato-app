import React from 'react';
import { RecommendedListing } from '@/hooks/useRecommendedListings';
import RecommendedServiceCard from './RecommendedServiceCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RecommendedServicesCarouselProps {
  listings: RecommendedListing[];
  isLoading?: boolean;
}

const RecommendedServicesCarousel = ({ listings, isLoading }: RecommendedServicesCarouselProps) => {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-[150px]">
            <Skeleton className="aspect-[4/3] rounded-xl mb-2" />
            <Skeleton className="h-3 w-20 mb-1" />
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (!listings?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay servicios recomendados disponibles.
      </p>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {listings.map((listing) => (
        <RecommendedServiceCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
};

export default RecommendedServicesCarousel;
