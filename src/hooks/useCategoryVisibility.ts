
import { useEffect, useState } from 'react';

export const useCategoryVisibility = () => {
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const categoryName = entry.target.getAttribute('data-category');
            if (categoryName) {
              setVisibleItems(prev => new Set([...prev, categoryName]));
            }
          }
        });
      },
      { 
        rootMargin: '100px', // Aumentamos el margen para precargar antes
        threshold: 0.1
      }
    );

    // Observar elementos inmediatamente sin delay
    const observeElements = () => {
      document.querySelectorAll('[data-category]').forEach(el => {
        observer.observe(el);
      });
    };

    // Intentar inmediatamente y con pequeño delay como backup
    observeElements();
    const timer = setTimeout(observeElements, 10);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return { visibleItems };
};
