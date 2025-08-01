import React from 'react';
import UnifiedAvatar from './unified-avatar';

interface ProviderAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const ProviderAvatar = ({ 
  src, 
  name = '',
  className,
  size = 'md'
}: ProviderAvatarProps) => {
  // REFACTORED: Direct proxy to UnifiedAvatar for consistency
  return (
    <UnifiedAvatar
      src={src}
      name={name}
      className={className}
      size={size}
    />
  );
};

export default ProviderAvatar;