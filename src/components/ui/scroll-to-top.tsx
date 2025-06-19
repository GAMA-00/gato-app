
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToTopProps {
  className?: string;
  threshold?: number;
}

const ScrollToTop = ({ className, threshold = 400 }: ScrollToTopProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-50 rounded-full shadow-lg transition-all duration-300 bg-luxury-navy hover:bg-luxury-navy/90',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
      aria-label="Volver al inicio"
    >
      <ChevronUp className="h-5 w-5 text-white" />
    </Button>
  );
};

export default ScrollToTop;
