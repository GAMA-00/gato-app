import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';
import * as LucideIcons from 'lucide-react';

const ClientCategoryDetails = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('name', categoryId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  const { data: serviceTypes = [], isLoading: serviceTypesLoading } = useQuery({
    queryKey: ['service-types', categoryData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categoryData.id);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryData?.id,
  });

  const isLoading = categoryLoading || serviceTypesLoading;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Tipos de Servicio" subtitle="Cargando...">
          <div className="space-y-4">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  const categoryLabel = categoryData?.label || categoryId;

  // Map of custom images for home category services
  const homeServiceImages: Record<string, string> = {
    'limpieza': '/lovable-uploads/567579a7-a7de-4761-acfd-31b8ca0809b1.png',
    'planchado': '/lovable-uploads/cb20f484-db92-4a96-9734-e3c343529266.png',
    'jardin': '/lovable-uploads/13aebed9-88aa-427c-a235-0e9d57e92bef.png',
    'jardinero': '/lovable-uploads/13aebed9-88aa-427c-a235-0e9d57e92bef.png',
    'mantenimiento': '/lovable-uploads/bd6c577e-1953-44ff-ac4e-f2c9fc5ebef3.png',
    'chef': '/lovable-uploads/56fd025e-2847-4d55-af93-1b8c7391277d.png',
    'lavacar': '/lovable-uploads/26896390-5198-4e8f-bbe9-8b2940b77897.png',
    'lava car': '/lovable-uploads/26896390-5198-4e8f-bbe9-8b2940b77897.png',
  };

  // Map of custom images for pets category services
  const petsServiceImages: Record<string, string> = {
    'paseo': '/lovable-uploads/121fbde3-9cdb-4972-907d-4bac918cccaf.png',
    'grooming': '/lovable-uploads/95029500-66a6-4711-833a-d209d54b6f47.png',
    'veterinario': '/lovable-uploads/99cfe636-bb09-4d44-966a-e1a7f6c2d8a8.png',
  };

  // Map of custom images for classes category services
  const classesServiceImages: Record<string, string> = {
    'tutorías primaria': '/lovable-uploads/fe78ad3e-cb50-4344-a2ec-b8df7a28a823.png',
    'tutorias primaria': '/lovable-uploads/fe78ad3e-cb50-4344-a2ec-b8df7a28a823.png',
    'primaria': '/lovable-uploads/fe78ad3e-cb50-4344-a2ec-b8df7a28a823.png',
    'tutorías secundaria': '/lovable-uploads/9a88309d-ece9-4315-9566-3eb06a065458.png',
    'tutorias secundaria': '/lovable-uploads/9a88309d-ece9-4315-9566-3eb06a065458.png',
    'secundaria': '/lovable-uploads/9a88309d-ece9-4315-9566-3eb06a065458.png',
    'idiomas': '/lovable-uploads/ee35d00e-2237-4815-a151-f04446309b1f.png',
    'idioma': '/lovable-uploads/ee35d00e-2237-4815-a151-f04446309b1f.png',
    'instrumentos': '/lovable-uploads/c7afa41f-0259-4355-887d-655febbe4367.png',
    'instrumento': '/lovable-uploads/c7afa41f-0259-4355-887d-655febbe4367.png',
    'música': '/lovable-uploads/c7afa41f-0259-4355-887d-655febbe4367.png',
    'musica': '/lovable-uploads/c7afa41f-0259-4355-887d-655febbe4367.png',
    'pintura': '/lovable-uploads/1eb5b922-24f4-472f-9474-62d3123e0ff0.png',
    'arte': '/lovable-uploads/1eb5b922-24f4-472f-9474-62d3123e0ff0.png',
  };

  // Map of custom images for personal-care category services
  const personalCareServiceImages: Record<string, string> = {
    'peluqueria': '/lovable-uploads/92c8e6fd-f64c-405f-89b3-d687e1feb69d.png',
    'peluquería': '/lovable-uploads/92c8e6fd-f64c-405f-89b3-d687e1feb69d.png',
    'cabello': '/lovable-uploads/92c8e6fd-f64c-405f-89b3-d687e1feb69d.png',
    'manicurista': '/lovable-uploads/d1e8fd1d-5a89-413a-b895-79cb58c06e4c.png',
    'manicure': '/lovable-uploads/d1e8fd1d-5a89-413a-b895-79cb58c06e4c.png',
    'uñas': '/lovable-uploads/d1e8fd1d-5a89-413a-b895-79cb58c06e4c.png',
    'depilación': '/lovable-uploads/c78e3ba3-f32e-4a98-943c-d7d3480de2a2.png',
    'depilacion': '/lovable-uploads/c78e3ba3-f32e-4a98-943c-d7d3480de2a2.png',
    'cera': '/lovable-uploads/c78e3ba3-f32e-4a98-943c-d7d3480de2a2.png',
    'masajista': '/lovable-uploads/949df310-202f-4b3f-af36-76e7450a1a11.png',
    'masaje': '/lovable-uploads/949df310-202f-4b3f-af36-76e7450a1a11.png',
    'relajación': '/lovable-uploads/949df310-202f-4b3f-af36-76e7450a1a11.png',
    'relajacion': '/lovable-uploads/949df310-202f-4b3f-af36-76e7450a1a11.png',
    'fisioterapia': '/lovable-uploads/39418bbd-bfcb-4da3-bd68-1c80242e31d8.png',
    'fisioterapeuta': '/lovable-uploads/39418bbd-bfcb-4da3-bd68-1c80242e31d8.png',
    'terapia': '/lovable-uploads/39418bbd-bfcb-4da3-bd68-1c80242e31d8.png',
  };

  // Map of custom images for sports category services
  const sportsServiceImages: Record<string, string> = {
    'entrenador personal': '/lovable-uploads/6208d524-23f4-4da3-a5fa-24368fe78a37.png',
    'entrenador': '/lovable-uploads/6208d524-23f4-4da3-a5fa-24368fe78a37.png',
    'personal': '/lovable-uploads/6208d524-23f4-4da3-a5fa-24368fe78a37.png',
    'fitness': '/lovable-uploads/6208d524-23f4-4da3-a5fa-24368fe78a37.png',
    'yoga': '/lovable-uploads/2b8dca29-207b-477f-9210-30abc0b5bd09.png',
    'pilates': '/lovable-uploads/211eb627-4974-4ade-b35a-d621e5330e80.png',
    'tenis': '/lovable-uploads/67815296-ce95-4fea-a5e0-c001c93a7170.png',
    'tennis': '/lovable-uploads/67815296-ce95-4fea-a5e0-c001c93a7170.png',
    'mantenimiento bicicletas': '/lovable-uploads/28b5b123-ea57-472a-9cd2-6eba0e00243e.png',
    'bicicletas': '/lovable-uploads/28b5b123-ea57-472a-9cd2-6eba0e00243e.png',
    'bicicleta': '/lovable-uploads/28b5b123-ea57-472a-9cd2-6eba0e00243e.png',
    'bike': '/lovable-uploads/28b5b123-ea57-472a-9cd2-6eba0e00243e.png',
  };

  // Map of custom images for other category services
  const otherServiceImages: Record<string, string> = {
    'fotografo': '/lovable-uploads/918f1c80-5836-4209-97ae-1b16ec7534d9.png',
    'fotógrafo': '/lovable-uploads/918f1c80-5836-4209-97ae-1b16ec7534d9.png',
    'fotografia': '/lovable-uploads/918f1c80-5836-4209-97ae-1b16ec7534d9.png',
    'fotografía': '/lovable-uploads/918f1c80-5836-4209-97ae-1b16ec7534d9.png',
    'niñera': '/lovable-uploads/5ff33cd8-4c58-45c5-af52-7a34cfa108e7.png',
    'ninera': '/lovable-uploads/5ff33cd8-4c58-45c5-af52-7a34cfa108e7.png',
    'babysitter': '/lovable-uploads/5ff33cd8-4c58-45c5-af52-7a34cfa108e7.png',
    'cuidado': '/lovable-uploads/5ff33cd8-4c58-45c5-af52-7a34cfa108e7.png',
    'cuidado adulto mayor': '/lovable-uploads/b69da166-7af3-4f25-a769-6a3defdc3edd.png',
    'adulto mayor': '/lovable-uploads/b69da166-7af3-4f25-a769-6a3defdc3edd.png',
    'enfermeria': '/lovable-uploads/b69da166-7af3-4f25-a769-6a3defdc3edd.png',
    'enfermería': '/lovable-uploads/b69da166-7af3-4f25-a769-6a3defdc3edd.png',
  };

  // Get specific service icon based on service name
  const getServiceTypeIcon = (serviceName: string) => {
    const normalizedName = serviceName.toLowerCase();
    
    // Check if this is a home category service with custom image
    if (categoryId === 'home') {
      for (const [key, imagePath] of Object.entries(homeServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Check if this is a pets category service with custom image
    if (categoryId === 'pets') {
      for (const [key, imagePath] of Object.entries(petsServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Check if this is a classes category service with custom image
    if (categoryId === 'classes') {
      for (const [key, imagePath] of Object.entries(classesServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Check if this is a personal-care category service with custom image
    if (categoryId === 'personal-care') {
      for (const [key, imagePath] of Object.entries(personalCareServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Check if this is a sports category service with custom image
    if (categoryId === 'sports') {
      for (const [key, imagePath] of Object.entries(sportsServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Check if this is an other category service with custom image
    if (categoryId === 'other') {
      for (const [key, imagePath] of Object.entries(otherServiceImages)) {
        if (normalizedName.includes(key)) {
          return { type: 'image', src: imagePath };
        }
      }
    }
    
    // Fallback to Lucide icons for other services
    if (normalizedName.includes('limpieza')) {
      return { type: 'icon', component: LucideIcons.Sparkles };
    } else if (normalizedName.includes('planchado')) {
      return { type: 'icon', component: LucideIcons.Shirt };
    } else if (normalizedName.includes('jardin')) {
      return { type: 'icon', component: LucideIcons.Trees };
    } else if (normalizedName.includes('mantenimiento')) {
      return { type: 'icon', component: LucideIcons.Wrench };
    } else if (normalizedName.includes('chef') || normalizedName.includes('cocin')) {
      return { type: 'icon', component: LucideIcons.ChefHat };
    } else if (normalizedName.includes('lavacar') || normalizedName.includes('lava car')) {
      return { type: 'icon', component: LucideIcons.Car };
    }
    
    // Default fallback icon
    return { type: 'icon', component: LucideIcons.Briefcase };
  };

  return (
    <>
      <Navbar />
      <PageContainer title="Tipos de Servicio" subtitle={`Categoría: ${categoryLabel}`}>
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/client/categories')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a categorías
          </Button>
          
          {serviceTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay tipos de servicio disponibles para esta categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {serviceTypes.map((serviceType) => {
                const serviceIcon = getServiceTypeIcon(serviceType.name);
                
                return (
                  <Card 
                    key={serviceType.id}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer bg-white border border-gray-100"
                    onClick={() => navigate(`/client/results?serviceId=${serviceType.id}&categoryName=${encodeURIComponent(categoryLabel)}`)}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-24 h-24 bg-luxury-navy rounded-full flex items-center justify-center">
                        {serviceIcon.type === 'image' ? (
                          <img 
                            src={serviceIcon.src} 
                            alt={serviceType.name}
                            className="w-20 h-20 object-contain"
                          />
                        ) : (
                          React.createElement(serviceIcon.component, {
                            className: "h-12 w-12 text-white"
                          })
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-gray-900 mb-1">{serviceType.name}</h3>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientCategoryDetails;
