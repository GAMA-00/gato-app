
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, Book, Home, Scissors, Dog, Globe, Dumbbell, LucideIcon, Car,
  Music, Paintbrush, ChefHat, Laptop, Shirt, User, Baby, Wrench, Heart, Flower, 
  GraduationCap, Bike, Waves, Sparkles, Palette, Languages, Guitar, PersonStanding,
  Hand, Eclipse, Sprout, HeartPulse, Shapes, Camera, Shower, HeartHandshake, PawPrint
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon> = {
  'classes': Book,
  'personal-care': Scissors,
  'sports': Dumbbell,
  'home': Home,
  'pets': PawPrint,  // Updated to PawPrint
  'other': Globe,
};

// Mapa de iconos específico para tipos de servicio especiales
const serviceIconMap: Record<string, LucideIcon> = {
  // Hogar
  'Lavacar': Car,
  'Limpieza': Sparkles,
  'Plomería': Wrench,
  'Electricista': Wrench,
  'Mantenimiento': Wrench,
  'Jardinería': Sprout,  // Updated to Sprout
  'Planchado': Shirt,    // Updated to Shirt
  
  // Clases
  'Música': Music,
  'Arte': Paintbrush,
  'Cocina': ChefHat,
  'Computación': Laptop,
  'Idiomas': Languages,  // Updated to Languages
  'Pintura': Palette,    // Added Pintura with Palette icon
  'Instrumentos': Guitar, // Added Instrumentos with Guitar icon
  'Tutorías Primaria': GraduationCap,  // Updated name
  'Tutorías Secundaria': GraduationCap,  // Updated name
  'Tutorias primaria': GraduationCap,  // Keep for backward compatibility
  'Tutorias secundaria': GraduationCap,  // Keep for backward compatibility
  
  // Cuidado Personal
  'Peluquería': Scissors,
  'Manicure': Hand,      // Updated to Hand
  'Pedicure': Sparkles,
  'Maquillaje': User,
  'Masaje': PersonStanding, // Updated to PersonStanding
  'Fisioterapia': PersonStanding, // Added Fisioterapia
  'Manicurista': Hand,   // Added Manicurista
  'Masajista': PersonStanding, // Added Masajista
  'Depilación': Shower,  // Changed from SoapDispenserDroplet to Shower
  
  // Deportes
  'Natación': Waves,
  'Ciclismo': Bike,
  'Entrenamiento': Dumbbell,
  'Mantenimiento bicicletas': Bike, // Added Mantenimiento bicicletas
  'Tenis': Eclipse,      // Added Tenis
  
  // Mascotas
  'Paseo': PawPrint,  // Updated to PawPrint
  'Veterinario': PawPrint,  // Updated to PawPrint
  'Peluquería canina': Scissors,
  
  // Otros servicios
  'Cuidado infantil': Baby,
  'Costura': Shirt,
  'Chef privado': ChefHat, // Added Chef privado
  'Cuidado Adulto mayor': HeartHandshake, // Updated to HeartHandshake
  'Niñera': Shapes,      // Added Niñera
  'Fotógrafo': Camera,  // Corrected spelling
  'Fotografo': Camera    // Keep for backward compatibility
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

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("ClientCategoryDetails rendered with category:", categoryName);
  }, [categoryName]);
  
  // Obtain category information
  const { data: categoryInfo, isLoading: loadingCategory } = useQuery({
    queryKey: ['category-info', categoryName],
    queryFn: async () => {
      if (!categoryName) return null;
      
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('name', categoryName)
        .single();
        
      if (error) {
        console.error("Error fetching category:", error);
        toast.error("Error al cargar la categoría");
        throw error;
      }
      
      console.log("Category info fetched:", data);
      return data;
    },
    enabled: !!categoryName
  });
  
  // Get services for this category
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['category-services', categoryName, categoryInfo?.id],
    queryFn: async () => {
      if (!categoryName || !categoryInfo) return [];
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categoryInfo.id)
        .order('name');
        
      if (error) {
        console.error("Error fetching services:", error);
        toast.error("Error al cargar los servicios");
        throw error;
      }
      
      console.log("Services fetched:", data);
      return data;
    },
    enabled: !!categoryName && !!categoryInfo
  });

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    console.log("Service selected:", serviceId, "Category:", categoryName);
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };

  // Go back to categories page
  const handleBack = () => {
    navigate('/client');
  };

  const isLoading = loadingCategory || loadingServices;
  
  // Determinar el icono correcto para esta categoría
  const CategoryIcon = categoryName ? iconMap[categoryName] || Book : Book;
  
  // Determinar la etiqueta en español
  const displayLabel = categoryName ? categoryLabels[categoryName] || categoryInfo?.label || '' : '';

  // Create the back button as a React element
  const backButton = (
    <Button 
      variant="outline" 
      onClick={handleBack} 
      className="px-4 py-2 h-auto border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#FEEBCB]/50 hover:text-[#1A1A1A]"
    >
      <ArrowLeft size={16} className="mr-2" />
      <span>Volver</span>
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer
        title="Cargando servicios..."
        subtitle={backButton}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 md:h-36 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <div className="flex items-center space-x-3">
          <CategoryIcon size={32} strokeWidth={2.5} className="text-[#1A1A1A]" />
          <span className="font-semibold text-[#1A1A1A]">{displayLabel}</span>
        </div>
      }
      subtitle={backButton}
      className="pt-1"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {services.map((service) => {
          // Determinar el icono para este servicio específico
          const ServiceIcon = serviceIconMap[service.name] || CategoryIcon;
          
          return (
            <Card 
              key={service.id}
              className={`flex flex-col items-center p-3 md:p-6 hover:shadow-lg transition-all cursor-pointer bg-white justify-center group ${isMobile ? 'h-28' : 'h-36'}`}
              onClick={() => handleServiceSelect(service.id)}
            >
              <ServiceIcon size={isMobile ? 32 : 40} strokeWidth={2.5} className="text-[#1A1A1A] mb-3" />
              <h3 className="text-center font-semibold text-sm md:text-base text-[#1A1A1A]">{service.name}</h3>
            </Card>
          );
        })}
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#1A1A1A]">No hay servicios disponibles en esta categoría.</p>
        </div>
      )}
    </PageContainer>
  );
};

export default ClientCategoryDetails;
