import React, { useState, useEffect } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UnifiedAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onError?: () => void;
  onLoad?: () => void;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm', 
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-xl'
};

const UnifiedAvatar: React.FC<UnifiedAvatarProps> = ({ 
  src, 
  name, 
  className, 
  size = 'md',
  onError,
  onLoad 
}) => {
  const [imageLoadStatus, setImageLoadStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  // Estados como ServiceGallery exitosa
  console.log("🔍 UnifiedAvatar Debug:", {
    src,
    name,
    size,
    imageLoadStatus,
    retryCount,
    currentSrc
  });

  // Generar initiales del nombre
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  // Construir URL con cache busting como la galería - FIX para loading infinito
  const getAvatarUrl = (url: string | null | undefined): string | null => {
    // Validación estricta como ServiceGallery - evita loading infinito con strings vacíos
    if (!url || typeof url !== 'string' || url.trim() === '' || url === 'null' || url === 'undefined') {
      console.log("🔗 Avatar URL: Invalid or empty, returning null:", url);
      return null;
    }

    let fullUrl = url;
    
    // Si es una URL relativa, construir URL completa
    if (url.startsWith('avatars/') || url.includes('/avatars/')) {
      fullUrl = `https://jckynopecuexfamepmoh.supabase.co/storage/v1/object/public/${url}`;
    }
    
    // Cache busting como ServiceGallery
    if (!fullUrl.includes('?t=')) {
      fullUrl += `?t=${Date.now()}`;
    }
    
    console.log("🔗 Avatar URL processing:", { original: url, processed: fullUrl });
    return fullUrl;
  };

  // Actualizar src cuando cambie la prop - FIX para evitar loading infinito
  useEffect(() => {
    const processedSrc = getAvatarUrl(src);
    if (processedSrc !== currentSrc) {
      setCurrentSrc(processedSrc || '');
      // Solo establecer 'loading' si realmente hay una URL válida para cargar
      setImageLoadStatus(processedSrc ? 'loading' : 'error');
      setRetryCount(0);
    }
  }, [src, currentSrc]);

  // Manejar error como ServiceGallery con reintentos
  const handleImageError = (event: any) => {
    console.error("❌ AVATAR LOAD ERROR:");
    console.error("URL:", currentSrc);
    console.error("Retry count:", retryCount);
    console.error("Error event:", event);
    
    if (retryCount < 2) {
      // Reintentar con cache busting más agresivo
      const retryUrl = currentSrc.split('?')[0] + `?retry=${retryCount + 1}&t=${Date.now()}`;
      console.log("🔄 Retrying avatar load:", retryUrl);
      setCurrentSrc(retryUrl);
      setRetryCount(prev => prev + 1);
      setImageLoadStatus('loading');
    } else {
      setImageLoadStatus('error');
      onError?.();
    }
  };

  // Manejar éxito como ServiceGallery
  const handleImageLoad = (event: any) => {
    console.log("✅ AVATAR LOAD SUCCESS:");
    console.log("URL:", currentSrc);
    console.log("Dimensions:", {
      naturalWidth: event.target.naturalWidth,
      naturalHeight: event.target.naturalHeight
    });
    
    setImageLoadStatus('success');
    onLoad?.();
  };

  const handleImageLoadStart = () => {
    console.log("🔄 AVATAR LOAD START:", currentSrc);
    setImageLoadStatus('loading');
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {currentSrc && imageLoadStatus !== 'error' && (
        <>
          {imageLoadStatus === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-full">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            </div>
          )}
          <AvatarImage
            src={currentSrc}
            alt={`Avatar de ${name}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            onLoadStart={handleImageLoadStart}
          />
        </>
      )}
      <AvatarFallback className="bg-luxury-gold/20 text-luxury-navy font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
};

export default UnifiedAvatar;