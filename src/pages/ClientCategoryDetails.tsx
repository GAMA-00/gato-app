
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import BackButton from '@/components/ui/back-button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Dumbbell, Globe, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon | 'custom-home' | 'custom-pets' | 'custom-classes' | 'custom-personal-care' | 'custom-sports' | 'custom-other'> = {
  'classes': 'custom-classes',
  'personal-care': 'custom-personal-care',
  'sports': 'custom-sports',
  'home': 'custom-home',
  'pets': 'custom-pets',
  'other': 'custom-other',
};

// Mapa de iconos específico para service types
const serviceTypeIconMap: Record<string, 'custom-cleaning' | 'custom-ironing' | 'custom-gardening' | 'custom-maintenance' | 'custom-chef' | 'custom-lavacar'> = {
  'Limpieza': 'custom-cleaning',
  'Planchado': 'custom-ironing',
  'Jardinero': 'custom-gardening',
  'Mantenimiento': 'custom-maintenance',
  'Chef Privado': 'custom-chef',
  'Lavacar': 'custom-lavacar',
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

// URLs organizadas para mejor gestión
const categoryImageUrls: Record<string, string> = {
  'home': '/lovable-uploads/f07d1b81-bbce-4517-9604-c3f62da6a1cc.png',
  'pets': '/lovable-uploads/2a5a7cb4-2bbb-4182-8e3e-104e97e9e4a4.png',
  'classes': '/lovable-uploads/0270a22a-9e98-44c3-822d-78902b399852.png',
  'personal-care': '/lovable-uploads/418f124f-c897-4235-af63-b3bfa86e82b0.png',
  'sports': '/lovable-uploads/32716d11-a812-4004-80ce-c321b2875dbd.png',
  'other': '/lovable-uploads/93a01a24-483d-4e55-81ad-283713da9c6b.png',
};

const serviceTypeImageUrls: Record<string, string> = {
  'Limpieza': '/lovable-uploads/6047527f-3ae9-4185-ac20-e270f9ca6564.png',
  'Planchado': '/lovable-uploads/76ed8eca-0a47-4f10-9c81-4952f3bbffac.png',
  'Jardinero': '/lovable-uploads/2e2cb502-c37d-45c1-b1f6-a8d5fee54f0f.png',
  'Mantenimiento': '/lovable-uploads/e56c24e8-62d3-4d57-a8e9-7095604747b5.png',
  'Chef Privado': '/lovable-uploads/8920f161-fe99-4f6a-8709-c7ea46d585c8.png',
  'Lavacar': '/lovable-uploads/948ef535-f554-4a69-b690-581d742377b7.png',
};

// Preload estratégico solo de imágenes críticas
const preloadCriticalImages = (categoryName: string) => {
  // Preload del icono de categoría
  const categoryImageUrl = categoryImageUrls[categoryName];
  if (categoryImageUrl) {
    const img = new Image();
    img.src = categoryImageUrl;
    img.crossOrigin = 'anonymous';
  }
  
  // Preload de los primeros 3 service types que suelen ser más comunes
  const criticalServices = ['Limpieza', 'Mantenimiento', 'Jardinero'];
  criticalServices.forEach(serviceName => {
    const serviceImageUrl = serviceTypeImageUrls[serviceName];
    if (serviceImageUrl) {
      const img = new Image();
      img.src = serviceImageUrl;
      img.crossOrigin = 'anonymous';
    }
  });
};

// Componente optimizado para iconos de categoría
const CategoryIcon: React.FC<{
  categoryName: string;
  isMobile: boolean;
}> = ({ categoryName, isMobile }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const iconComponent = iconMap[categoryName || ''] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  if (!imageUrl || imageError) {
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
        loading="eager"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
};

// Componente optimizado para iconos de service types
const ServiceTypeIcon: React.FC<{
  serviceName: string;
  isMobile: boolean;
  isVisible: boolean;
}> = ({ serviceName, isMobile, isVisible }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = serviceTypeImageUrls[serviceName];
  
  if (!imageUrl || imageError) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex items-center justify-center mb-3",
      isMobile ? "mb-2" : "mb-3"
    )}>
      {!imageLoaded && (
        <Skeleton className={cn(
          "rounded",
          isMobile ? "w-12 h-12" : "w-16 h-16"
        )} />
      )}
      <img 
        src={imageUrl}
        alt={serviceName}
        className={cn(
          "object-contain transition-opacity duration-200",
          isMobile ? "w-12 h-12" : "w-16 h-16",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        loading={isVisible ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
};

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());

  // Preload crítico solo al montar el componente
  useEffect(() => {
    if (categoryName) {
      preloadCriticalImages(categoryName);
    }
  }, [categoryName]);

  // Intersection Observer para service types
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const serviceId = entry.target.getAttribute('data-service-id');
            if (serviceId) {
              setVisibleItems(prev => new Set([...prev, serviceId]));
            }
          }
        });
      },
      { 
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    const timer = setTimeout(() => {
      document.querySelectorAll('[data-service-id]').forEach(el => {
        observer.observe(el);
      });
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const { data: serviceTypes = [], isLoading } = useQuery({
    queryKey: ['service-types', categoryName],
    queryFn: async () => {
      const { data: categories, error: categoryError } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', categoryName)
        .single();
        
      if (categoryError) throw categoryError;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categories.id);
        
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const handleServiceClick = (serviceTypeId: string) => {
    navigate(`/client/results/${categoryName}/${serviceTypeId}`);
  };

  const handleBack = () => {
    navigate('/client');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-white relative">
        {/* Back button positioned absolutely in top-left corner */}
        <div className="absolute top-4 left-4 z-10">
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        {/* Category title */}
        <div className="pt-20 pb-6">
          <div className="text-center">
            <Skeleton className="h-8 w-32 mx-auto rounded" />
          </div>
        </div>

        {/* Services grid */}
        <div className="px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryLabel = categoryLabels[categoryName || ''] || categoryName;

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Back button positioned absolutely in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <BackButton onClick={handleBack} />
      </div>

      {/* Category title with icon */}
      <div className="pt-20 pb-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <CategoryIcon 
              categoryName={categoryName || ''}
              isMobile={isMobile}
            />
            <h1 className={cn(
              "font-bold tracking-tight text-app-text",
              isMobile ? "text-xl" : "text-2xl md:text-3xl"
            )}>
              {categoryLabel}
            </h1>
          </div>
        </div>
      </div>

      {/* Services grid with consistent styling */}
      <div className="px-4 md:px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
            {serviceTypes.map((serviceType) => {
              const hasCustomIcon = serviceTypeImageUrls[serviceType.name];
              const isVisible = visibleItems.has(serviceType.id);
              
              return (
                <div 
                  key={serviceType.id} 
                  onClick={() => handleServiceClick(serviceType.id)}
                  data-service-id={serviceType.id}
                >
                  <Card className={cn(
                    "relative overflow-hidden cursor-pointer transition-all duration-300 ease-in-out",
                    "bg-[#F2F2F2] border border-gray-200 shadow-sm hover:shadow-md",
                    "flex flex-col items-center justify-center",
                    "rounded-xl p-4",
                    hasCustomIcon ? "h-40 min-h-40" : "h-32 min-h-32"
                  )}>
                    {hasCustomIcon && (
                      <ServiceTypeIcon 
                        serviceName={serviceType.name}
                        isMobile={isMobile}
                        isVisible={isVisible}
                      />
                    )}
                    <h3 className={cn(
                      "text-center font-semibold text-[#1A1A1A] leading-tight",
                      "overflow-wrap-anywhere hyphens-auto",
                      isMobile ? "text-sm px-2" : "text-base px-3"
                    )}>
                      {serviceType.name === 'Jardinero' ? 'Jardinería' : serviceType.name}
                    </h3>
                  </Card>
                </div>
              );
            })}
            
            {serviceTypes.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientCategoryDetails;
