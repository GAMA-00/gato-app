import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ServiceVariantsSelector, { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderAbout from '@/components/providers/ProviderAbout';
import ProviderCertifications from '@/components/client/service/ProviderCertifications';
import TeamPhotoSection from '@/components/team/TeamPhotoSection';
import ProviderReviews from '@/components/providers/ProviderReviews';
import LevelBadge from '@/components/achievements/LevelBadge';
import { ProviderProfile } from '@/lib/types';
import { AchievementLevel } from '@/lib/achievementTypes';

interface ServiceDetailTabsProps {
  serviceDescription: string;
  serviceVariants: any[];
  selectedVariants: ServiceVariantWithQuantity[];
  onSelectVariant: (variants: ServiceVariantWithQuantity[]) => void;
  onBookService: () => void;
  transformedProvider: ProviderProfile;
  providerId: string;
  providerLevel: AchievementLevel;
}

const ServiceDetailTabs: React.FC<ServiceDetailTabsProps> = ({
  serviceDescription,
  serviceVariants,
  selectedVariants,
  onSelectVariant,
  onBookService,
  transformedProvider,
  providerId,
  providerLevel,
}) => {
  const [activeTab, setActiveTab] = useState('catalog');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Scroll to top when changing tabs
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-4 sticky top-12 z-10 bg-background border-b border-stone-200 rounded-none p-0 h-auto">
          <TabsTrigger 
            value="catalog"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Servicio
          </TabsTrigger>
          <TabsTrigger 
            value="gallery"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Galería
          </TabsTrigger>
          <TabsTrigger 
            value="about"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Sobre mí
          </TabsTrigger>
          <TabsTrigger 
            value="reviews"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
          >
            Reseñas
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Catálogo */}
        <TabsContent value="catalog" className="space-y-6">
          {/* Description - No Card */}
          <div className="px-4 py-6">
            <h3 className="text-base font-semibold mb-3">Descripción del servicio</h3>
            <p 
              className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${
                !isDescriptionExpanded ? 'line-clamp-2' : ''
              }`}
            >
              {serviceDescription}
            </p>
            {serviceDescription.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
              >
                {isDescriptionExpanded ? (
                  <>
                    Ver menos <ChevronUp className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  <>
                    Ver más <ChevronDown className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Service Variants Selector */}
          <div className="px-4">
            <ServiceVariantsSelector
              variants={serviceVariants}
              onSelectVariant={onSelectVariant}
            />
          </div>

          {/* Desktop booking button */}
          <div className="hidden sm:flex justify-center px-4 pb-6">
            <Button 
              onClick={onBookService}
              size="lg"
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-12 py-4 shadow-lg"
              disabled={selectedVariants.length === 0}
            >
              Reservar
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Galería */}
        <TabsContent value="gallery">
          <ProviderGallery provider={transformedProvider} />
        </TabsContent>

        {/* Tab 3: Sobre mí */}
        <TabsContent value="about" className="space-y-4 px-4">
          {/* Level Badge */}
          <div className="flex justify-center py-2">
            <LevelBadge level={providerLevel} size="md" />
          </div>
          
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
    </div>
  );
};

export default ServiceDetailTabs;
