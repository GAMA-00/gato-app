
import { useEffect } from 'react';
import { categoryImageUrls } from '@/constants/categoryConstants';

// Preload estratégico solo de las primeras 4 imágenes (las más visibles)
const preloadCriticalIcons = () => {
  const criticalCategories = ['home', 'pets', 'classes', 'personal-care'];
  
  criticalCategories.forEach(category => {
    const img = new Image();
    img.src = categoryImageUrls[category];
    // Configurar cache headers
    img.crossOrigin = 'anonymous';
  });
};

export const useCategoryPreload = () => {
  useEffect(() => {
    preloadCriticalIcons();
  }, []);
};
