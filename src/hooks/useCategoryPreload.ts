
import { useEffect } from 'react';
import { smartPreloader } from '@/utils/smartPreloader';

export const useCategoryPreload = () => {
  useEffect(() => {
    // Start with critical categories
    smartPreloader.preloadCriticalCategories();
    
    // Preload remaining images when idle
    const idleCallback = () => {
      smartPreloader.preloadRemainingImages();
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(idleCallback, { timeout: 5000 });
    } else {
      setTimeout(idleCallback, 3000);
    }
  }, []);
};
