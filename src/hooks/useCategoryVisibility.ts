
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
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    // Observar elementos después de que se rendericen
    const timer = setTimeout(() => {
      document.querySelectorAll('[data-category]').forEach(el => {
        observer.observe(el);
      });
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  return { visibleItems };
};
