
import { useState, useEffect, useCallback } from 'react';
import { imageMemoryCache } from '@/utils/imageCache';
import { smartPreloader } from '@/utils/smartPreloader';

interface UseImageCacheOptions {
  priority?: 'critical' | 'high' | 'medium' | 'low';
  preloadOnMount?: boolean;
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

      // Fetch and cache
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      await imageMemoryCache.set(url, blob, options.priority || 'medium');
      
      const blobUrl = URL.createObjectURL(blob);
      setCachedUrl(blobUrl);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to load image:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setIsLoading(false);
    }
  }, [url, options.priority]);

  useEffect(() => {
    if (options.preloadOnMount) {
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
