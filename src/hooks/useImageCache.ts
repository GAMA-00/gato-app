
import { useState, useEffect, useCallback } from 'react';
import { imageMemoryCache } from '@/utils/imageCache';
import { smartPreloader } from '@/utils/smartPreloader';

interface UseImageCacheOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  preloadOnMount?: boolean;
  timeout?: number;
}

export const useImageCache = (url: string, options: UseImageCacheOptions = {}) => {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadImage = useCallback(async () => {
    if (!url) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Try memory cache first
      const cached = await imageMemoryCache.get(url);
      if (cached) {
        setCachedUrl(cached);
        setIsLoading(false);
        return;
      }

      // Create timeout promise for fallback - increased timeout for better loading
      const timeoutMs = options.timeout || 3000; // Increased from 1000ms to 3000ms
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), timeoutMs)
      );

      // Race between fetch and timeout
      const fetchPromise = fetch(url).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      });

      try {
        const blob = await Promise.race([fetchPromise, timeoutPromise]) as Blob;
        await imageMemoryCache.set(url, blob, options.priority || 'medium');
        
        const blobUrl = URL.createObjectURL(blob);
        setCachedUrl(blobUrl);
        setIsLoading(false);
      } catch (timeoutError) {
        // En caso de timeout, permitir que la imagen se cargue directamente
        console.warn(`Cache timeout for ${url}, falling back to direct load`);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load image:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setIsLoading(false);
    }
  }, [url, options.priority, options.timeout]);

  useEffect(() => {
    if (options.preloadOnMount !== false) { // Default true
      loadImage();
    }
  }, [loadImage, options.preloadOnMount]);

  const preload = useCallback(() => {
    if (url && options.priority) {
      smartPreloader.preloadByPriority([{
        url,
        priority: options.priority
      }]);
    }
  }, [url, options.priority]);

  return {
    cachedUrl,
    isLoading,
    error,
    loadImage,
    preload
  };
};

// Hook for cache statistics
export const useImageCacheStats = () => {
  const [stats, setStats] = useState(smartPreloader.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(smartPreloader.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};
