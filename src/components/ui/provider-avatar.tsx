import React from 'react';
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
      return undefined;
    }
    
    // If it's already a full URL, return as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // For any path, construct the full Supabase URL (service-gallery bucket)
    return `https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/service-gallery/${url}`;
  };

  console.log('ProviderAvatar - src:', src, 'processed:', getAvatarUrl(src));

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage 
        src={getAvatarUrl(src)} 
        alt={`${name} avatar`}
        className="object-cover"
      />
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default ProviderAvatar;