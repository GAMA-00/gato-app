import React from 'react';
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

const ClientServices = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
        
      if (error) throw error;
      return data;
    },
  });

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Servicios" subtitle="Cargando categorías...">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer title="Servicios" subtitle="Selecciona una categoría">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
          {categories.map((category) => (
            <Card 
              key={category.id} 
              onClick={() => handleCategoryClick(category.name)}
              className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] h-32 md:h-40"
            >
              <div className="flex items-center justify-center mb-3">
                <Book className="h-8 w-8 md:h-10 md:w-10 text-[#1A1A1A]" />
              </div>
              <h3 className="text-center text-[#1A1A1A] text-sm md:text-base font-semibold">
                {category.label}
              </h3>
            </Card>
          ))}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientServices;
