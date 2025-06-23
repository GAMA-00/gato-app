
import { useEffect } from 'react';
import { smartPreloader } from '@/utils/smartPreloader';

export const useCategoryPreload = () => {
  useEffect(() => {
    // Inmediatamente precargar categorías críticas
    smartPreloader.preloadCriticalCategories();
    
    // Precargar imágenes restantes sin delay para mejor UX
    const immediatePreload = () => {
      smartPreloader.preloadRemainingImages();
    };

    // Ejecutar inmediatamente
    immediatePreload();

    // También programar para cuando el navegador esté idle
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        smartPreloader.preloadRemainingImages();
      }, { timeout: 2000 });
    }
  }, []);
};
