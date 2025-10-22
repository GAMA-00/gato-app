import { useEffect } from 'react';

interface PreloadOptions {
  priority?: 'high' | 'low' | 'auto';
  as?: 'image' | 'fetch';
}

export const useImagePreload = (urls: string | string[], options: PreloadOptions = {}) => {
  useEffect(() => {
    const urlArray = Array.isArray(urls) ? urls : [urls];
    const links: HTMLLinkElement[] = [];

    urlArray.forEach((url) => {
      if (!url) return;

      // Create preload link element
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = options.as || 'image';
      link.href = url;
      
      if (options.priority) {
        link.setAttribute('fetchpriority', options.priority);
      }

      document.head.appendChild(link);
      links.push(link);
    });

    // Cleanup
    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [urls, options.priority, options.as]);
};

// Preload multiple images with different priorities
export const preloadImages = (images: Array<{ url: string; priority?: 'high' | 'low' }>) => {
  images.forEach(({ url, priority = 'low' }) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    link.setAttribute('fetchpriority', priority);
    document.head.appendChild(link);
  });
};
