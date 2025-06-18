import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon | 'custom-home' | 'custom-pets' | 'custom-classes' | 'custom-personal-care' | 'custom-sports' | 'custom-other'> = {
  'classes': 'custom-classes',
  'personal-care': 'custom-personal-care',
  'sports': 'custom-sports',
  'home': 'custom-home',
  'pets': 'custom-pets',
  'other': 'custom-other',
};

// Nombres de categorías en español
const categoryLabels: Record<string, string> = {
  'classes': 'Clases',
  'personal-care': 'Cuidado Personal',
  'sports': 'Deportes',
  'home': 'Hogar',
  'pets': 'Mascotas',
  'other': 'Otros',
};

// Nuevo orden específico para las categorías
const categoryOrder = ['home', 'pets', 'classes', 'personal-care', 'sports', 'other'];

// URLs de imágenes para preload estratégico
const categoryImageUrls: Record<string, string> = {
  'home': '/lovable-uploads/11446302-74b0-4775-bc77-01fbf112f8f0.png',
  'pets': '/lovable-uploads/7613f29b-5528-4db5-9357-1d3724a98d5d.png',
  'classes': '/lovable-uploads/19672ce3-748b-4ea7-86dc-b281bb9b8d45.png',
  'personal-care': '/lovable-uploads/f5cf3911-b44f-47e9-b52e-4e16ab8b8987.png',
  'sports': '/lovable-uploads/44391171-f4e7-4ef6-8866-864fdade5d3c.png',
  'other': '/lovable-uploads/65de903f-70f1-4130-87f0-8152a49381fe.png',
};

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

// Componente para manejar imágenes con lazy loading y fallback
const CategoryIcon: React.FC<{
  categoryName: string;
  isMobile: boolean;
  isVisible: boolean;
}> = ({ categoryName, isMobile, isVisible }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const iconComponent = iconMap[categoryName] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  if (!imageUrl || imageError) {
    // Fallback a icono Lucide si no hay imagen personalizada o hay error
    return React.createElement(iconComponent as LucideIcon, {
      size: isMobile ? 54 : 72,
      strokeWidth: isMobile ? 2 : 1.8,
      className: "text-[#1A1A1A]"
    });
  }
  
  return (
    <div className="relative">
      {!imageLoaded && (
        <Skeleton className={cn(
          "absolute inset-0 rounded",
          isMobile ? "w-20 h-20" : "w-24 h-24"
        )} />
      )}
      <img 
        src={imageUrl}
        alt={categoryLabels[categoryName] || categoryName}
        className={cn(
          "object-contain transition-opacity duration-200",
          isMobile ? "w-20 h-20" : "w-24 h-24",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        loading={isVisible ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{
          imageRendering: 'crisp-edges',
          // Hint al navegador para optimizar caching
          willChange: imageLoaded ? 'auto' : 'opacity'
        }}
      />
    </div>
  );
};

const ClientCategoryView = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Preload crítico solo al montar el componente
  useEffect(() => {
    preloadCriticalIcons();
  }, []);

  // Intersection Observer para lazy loading más preciso
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

  const { data: fetchedCategories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
        
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantener en cache por 10 minutos
  });

  // Organizar categorías en el orden deseado
  const categories = [...fetchedCategories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.name);
    const indexB = categoryOrder.indexOf(b.name);
    return indexA - indexB;
  });

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={cn(
          isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
          "min-h-screen w-full bg-white"
        )}>
          <div className={cn(
            "w-full h-full flex flex-col justify-start items-center",
            isMobile ? "px-6 pt-4 pb-20" : "p-6"
          )}>
            <div className={cn(
              "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto",
              isMobile ? "px-6 w-full" : "px-2 md:px-6"
            )}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={cn(
                  isMobile ? "h-36 rounded-xl" : "h-32 md:h-40 rounded-xl"
                )} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const textSizeClass = isMobile ? 'text-base font-semibold' : 'text-lg';
  
  return (
    <>
      <Navbar />
      <div className={cn(
        isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
        "min-h-screen w-full bg-white"
      )}>
        {/* Container for all content with tighter spacing on mobile */}
        <div className={cn(
          "w-full h-full flex flex-col justify-start items-center",
          isMobile ? "px-6 pt-4 pb-20" : "p-6"
        )}>
          <div className={cn(
            "max-w-7xl w-full animate-fade-in",
            "flex flex-col items-center justify-start"
          )}>
            {/* Title with reduced margin on mobile */}
            <div className={cn(
              "flex flex-col justify-center gap-1 w-full",
              isMobile ? "mb-6" : "mb-4"
            )}>
              <div className="w-full flex justify-center">
                <h1 className={cn(
                  "font-bold tracking-tight text-app-text text-center",
                  isMobile ? "text-2xl mb-0" : "text-2xl md:text-3xl mb-0"
                )}>
                  Explora nuestras categorías de servicio
                </h1>
              </div>
            </div>
            
            {/* Content area with reduced top margin on mobile */}
            <div className={cn(
              "animate-slide-up flex justify-center w-full flex-1 items-start",
              isMobile ? "mt-0" : "mt-4"
            )}>
              <div className="w-full flex justify-center">
                <div className={cn(
                  "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto",
                  isMobile ? "w-full" : "px-2 md:px-6"
                )}>
                  {categoryOrder.map((categoryName) => {
                    const category = categories.find(c => c.name === categoryName);
                    if (!category) return null;
                    
                    const isVisible = visibleItems.has(categoryName);
                    
                    return (
                      <div 
                        key={category.id} 
                        onClick={() => handleCategoryClick(category.name)}
                        data-category={categoryName}
                      >
                        <Card className={cn(
                          "flex flex-col items-center justify-center hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group",
                          isMobile ? "p-6 h-36 rounded-xl" : "p-8 h-48"
                        )}>
                          <div className={cn(
                            "flex items-center justify-center",
                            isMobile ? "mb-3" : "mb-4"
                          )}>
                            <CategoryIcon 
                              categoryName={categoryName}
                              isMobile={isMobile}
                              isVisible={isVisible}
                            />
                          </div>
                          <h3 className={cn(
                            "text-center text-[#1A1A1A] overflow-wrap-anywhere hyphens-auto",
                            textSizeClass,
                            isMobile ? "px-2" : "px-2"
                          )}>
                            {categoryLabels[category.name] || category.label}
                          </h3>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientCategoryView;
