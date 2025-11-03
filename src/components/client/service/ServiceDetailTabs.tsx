import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, Home, Image, User, MessageSquare } from 'lucide-react';
import ServiceVariantsSelector, { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderAbout from '@/components/providers/ProviderAbout';
import ProviderCertifications from '@/components/client/service/ProviderCertifications';
import TeamPhotoSection from '@/components/team/TeamPhotoSection';
import ProviderReviews from '@/components/providers/ProviderReviews';
import { ProviderProfile } from '@/lib/types';

interface ServiceDetailTabsProps {
  serviceDescription: string;
  serviceVariants: any[];
  selectedVariants: ServiceVariantWithQuantity[];
  onSelectVariant: (variants: ServiceVariantWithQuantity[]) => void;
  onBookService: () => void;
  transformedProvider: ProviderProfile;
  providerId: string;
}

const ServiceDetailTabs: React.FC<ServiceDetailTabsProps> = ({
  serviceDescription,
  serviceVariants,
  selectedVariants,
  onSelectVariant,
  onBookService,
  transformedProvider,
  providerId,
}) => {
  const [activeTab, setActiveTab] = useState('catalog');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-6">
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogo</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Galería</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Sobre mí</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Reseñas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Catálogo */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Descripción del servicio */}
          <div className="bg-white rounded-lg border border-stone-200 shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium mb-3">Descripción del servicio</h3>
            <p className="text-muted-foreground whitespace-pre-line text-sm sm:text-base leading-relaxed">
              {serviceDescription}
            </p>
          </div>

          {/* Catálogo de Servicios */}
          {serviceVariants && serviceVariants.length > 0 && (
            <div className="space-y-6">
              <ServiceVariantsSelector
                variants={serviceVariants}
                onSelectVariant={onSelectVariant}
              />
              
              {/* Botón Agendar dentro del catálogo */}
              <div className="flex justify-center w-full">
                <Button 
                  onClick={onBookService}
                  size="lg"
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg px-8 sm:px-12 py-3 sm:py-4 shadow-lg"
                  disabled={selectedVariants.length === 0}
                >
                  <Calendar className="mr-3 h-5 w-5 sm:h-6 sm:w-6" />
                  Agendar Servicio
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Galería */}
        <TabsContent value="gallery">
          <ProviderGallery provider={transformedProvider} />
        </TabsContent>

        {/* Tab 3: Sobre mí */}
        <TabsContent value="about" className="space-y-6">
          <ProviderAbout provider={transformedProvider} />
          
          <ProviderCertifications 
            certifications={transformedProvider.certificationFiles}
          />
          
          <TeamPhotoSection providerId={providerId} />
        </TabsContent>

        {/* Tab 4: Comentarios */}
        <TabsContent value="reviews">
          <ProviderReviews provider={transformedProvider} />
        </TabsContent>
      </Tabs>

      {/* Botón sticky al fondo en móvil (solo visible en tab catálogo) */}
      {activeTab === 'catalog' && serviceVariants && serviceVariants.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t shadow-lg sm:hidden z-10">
          <Button 
            onClick={onBookService}
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={selectedVariants.length === 0}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Agendar Servicio
          </Button>
        </div>
      )}
    </div>
  );
};

export default ServiceDetailTabs;
