import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProviderAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-12 w-12',
  xl: 'h-20 w-20'
};

const ProviderAvatar = ({ 
  src, 
  name = '',
  className,
  size = 'md'
}: ProviderAvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  const getAvatarUrl = (url: string | null | undefined) => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      console.log('ProviderAvatar - No URL provided');
      return undefined;
    }
    
    // If it's already a full URL, add cache busting if needed
    if (url.startsWith('http')) {
      console.log('ProviderAvatar - Using full URL:', url);
      // Add cache busting if not already present
      if (!url.includes('?t=')) {
        const timestamp = new Date().getTime();
        return `${url}?t=${timestamp}`;
      }
      return url;
    }
    
    // For any path, construct the full Supabase URL (avatars bucket) with cache busting
    const timestamp = new Date().getTime();
    const fullUrl = `https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/avatars/${url}?t=${timestamp}`;
    console.log('ProviderAvatar - Constructed URL with cache busting:', fullUrl);
    return fullUrl;
  };

  const finalUrl = getAvatarUrl(src);
  console.log('ProviderAvatar - Final processing:', { src, name, finalUrl, imageError });

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {finalUrl && !imageError ? (
        <AvatarImage 
          src={finalUrl} 
          alt={`${name} avatar`}
          className="object-cover"
          onError={(e) => {
            console.error('ProviderAvatar - Image failed to load:', finalUrl);
            console.error('ProviderAvatar - Error details:', e);
            setImageError(true);
            
            // Retry once without cache busting in case the issue is with the timestamp
            if (finalUrl?.includes('?t=')) {
              const urlWithoutCache = finalUrl.split('?t=')[0];
              console.log('ProviderAvatar - Retrying without cache busting:', urlWithoutCache);
              setTimeout(() => {
                const img = document.createElement('img');
                img.onload = () => console.log('ProviderAvatar - Retry successful');
                img.onerror = () => console.error('ProviderAvatar - Retry also failed');
                img.src = urlWithoutCache;
              }, 1000);
            }
          }}
          onLoad={() => {
            console.log('ProviderAvatar - Image loaded successfully:', finalUrl);
            setImageError(false);
          }}
        />
      ) : null}
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default ProviderAvatar;