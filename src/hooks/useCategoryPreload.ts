
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { smartPreloader } from '@/utils/smartPreloader';

export const useCategoryPreload = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Only preload on client routes (not landing page)
    if (!location.pathname.includes('/client') || location.pathname.includes('/login')) {
      return;
    }

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        smartPreloader.preloadCriticalCategories();
        
        // Preload remaining images after a short delay
        setTimeout(() => {
          smartPreloader.preloadRemainingImages();
        }, 500);
      }, { timeout: 3000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        smartPreloader.preloadCriticalCategories();
        setTimeout(() => {
          smartPreloader.preloadRemainingImages();
        }, 500);
      }, 100);
    }
  }, [location.pathname]);
};
