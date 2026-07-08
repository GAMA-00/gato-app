import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import { RecommendedListing } from '@/hooks/useRecommendedListings';
import { cn } from '@/lib/utils';

const getInitials = (name?: string | null) =>
  (name || 'P').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

interface Props {
  listing: RecommendedListing;
  className?: string;
}

const RecommendedServiceCard = ({ listing, className }: Props) => {
  const navigate = useNavigate();
  const providerName = listing.provider?.name || 'Proveedor';
  const avatarUrl = listing.provider?.avatar_url;
  const rating = listing.provider?.average_rating;
  const serviceTypeName = listing.service_type?.name || listing.title;

  const handleClick = () => {
    if (listing.provider?.id) {
      navigate(`/client/service/${listing.provider.id}/${listing.id}`);
    }
  };

  return (
    <div
      className={cn('flex-shrink-0 w-[150px] cursor-pointer group', className)}
      onClick={handleClick}
    >
      {/* Avatar / photo */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={providerName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
            <span className="text-2xl font-bold text-primary/70">
              {getInitials(providerName)}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground truncate">{providerName}</p>
        <p className="text-xs text-muted-foreground truncate">{serviceTypeName}</p>
        {rating != null && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{Number(rating).toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedServiceCard;
