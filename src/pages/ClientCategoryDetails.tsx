
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import BackButton from '@/components/ui/back-button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Dumbbell, Globe, LucideIcon, ChefHat, Dog, Scissors, Stethoscope } from 'lucide-react';
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

// Mapa de iconos fallback para service types
const serviceTypeFallbackIcons: Record<string, LucideIcon> = {
  'Chef Privado': ChefHat,
  'Paseo de Perros': Dog,
  'Pet grooming': Scissors,
  'Veterinario': Stethoscope,
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
  'home': '/lovable-uploads/11446302-74b0-4775-bc77-01fbf112f8f0.png',
  'pets': '/lovable-uploads/7613f29b-5528-4db5-9357-1d3724a98d5d.png',
  'classes': '/lovable-uploads/19672ce3-748b-4ea7-86dc-b281bb9b8d45.png',
  'personal-care': '/lovable-uploads/f5cf3911-b44f-47e9-b52e-4e16ab8b8987.png',
  'sports': '/lovable-uploads/44391171-f4e7-4ef6-8866-864fdade5d3c.png',
  'other': '/lovable-uploads/65de903f-70f1-4130-87f0-8152a49381fe.png',
};

const serviceTypeImageUrls: Record<string, string> = {
  'Limpieza': '/lovable-uploads/763bd89f-c937-40f1-8225-a9eede2cdde0.png',
  'Planchado': '/lovable-uploads/4dd64b16-03f3-45bb-bebc-188ff928779b.png',
  'Jardinero': '/lovable-uploads/431b8b90-dc9d-4672-a888-f58db64827dc.png',
  'Mantenimiento': '/lovable-uploads/24e54baf-3cf6-41b3-a409-5d709cdcdea5.png',
  'Chef Privado': '/lovable-uploads/884a985a-9ea1-46b2-9b84-f4f0e472138f.png',
  'Lavacar': '/lovable-uploads/a6adbbab-4b35-433d-bccc-28ecf1f6e144.png',
  'Paseo de Perros': '/lovable-uploads/bcd7b687-ff20-4036-b242-7973ba844180.png',
  'Pet grooming': '/lovable-uploads/ce12c763-c1e5-4dea-91e0-78b386608ca1.png',
  'Veterinario': '/lovable-uploads/bc600f5b-81c3-4589-9558-a17f9bb7f093.png',
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
  let criticalServices: string[] = [];
  if (categoryName === 'home') {
    criticalServices = ['Limpieza', 'Mantenimiento', 'Chef Privado'];
  } else if (categoryName === 'pets') {
    criticalServices = ['Paseo de Perros', 'Pet grooming', 'Veterinario'];
  }
  
  criticalServices.forEach(serviceName => {
    const serviceImageUrl = serviceTypeImageUrls[serviceName];
    if (serviceImageUrl) {
      const img = new Image();
      img.src = serviceImageUrl;
      img.crossOrigin = 'anonymous';
      console.log(`Preloading image for ${serviceName}: ${serviceImageUrl}`);
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

// Componente simplificado para iconos de service types - SIEMPRE carga eager
const ServiceTypeIcon: React.FC<{
  serviceName: string;
  isMobile: boolean;
}> = ({ serviceName, isMobile }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = serviceTypeImageUrls[serviceName];
  const fallbackIcon = serviceTypeFallbackIcons[serviceName];
  
  console.log(`ServiceTypeIcon - Service: ${serviceName}, Image URL: ${imageUrl}, Loaded: ${imageLoaded}, Error: ${imageError}`);
  
  // Si hay error o no hay imagen, mostrar fallback icon
  if (imageError || !imageUrl) {
    if (fallbackIcon) {
      return (
        <div className={cn(
          "flex items-center justify-center mb-3",
          isMobile ? "mb-2" : "mb-3"
        )}>
          {React.createElement(fallbackIcon, {
            size: isMobile ? 48 : 64,
            strokeWidth: 1.5,
            className: "text-[#1A1A1A]"
          })}
        </div>
      );
    }
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
        loading="eager"
        decoding="async"
        onLoad={() => {
          console.log(`Image loaded successfully for ${serviceName}`);
          setImageLoaded(true);
        }}
        onError={(e) => {
          console.error(`Error loading image for ${serviceName}:`, e);
          setImageError(true);
        }}
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
};

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Preload crítico solo al montar el componente
  useEffect(() => {
    if (categoryName) {
      preloadCriticalImages(categoryName);
    }
  }, [categoryName]);

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
              
              return (
                <div 
                  key={serviceType.id} 
                  onClick={() => handleServiceClick(serviceType.id)}
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
