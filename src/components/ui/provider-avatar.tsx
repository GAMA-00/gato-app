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
  // Usar el componente unificado directamente
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