import React from 'react';
import UnifiedAvatar from '@/components/ui/unified-avatar';

interface ServiceHeroSectionProps {
  backgroundImage?: string | null;
  avatar: string | null;
  providerName: string;
  serviceTitle: string;
}

const ServiceHeroSection = ({
  backgroundImage,
  avatar,
  providerName,
  serviceTitle
}: ServiceHeroSectionProps) => {
  return (
    <>
      {/* Hero section with background image */}
      <div className="relative h-72 bg-gradient-to-b from-stone-200 to-white">
        {/* Background Image */}
        {backgroundImage && (
          <div className="absolute inset-0 overflow-hidden">
            <img 
              src={backgroundImage} 
              alt="Background"
              className="w-full h-full object-cover opacity-30 blur-sm"
            />
          </div>
        )}
        
        {/* Avatar superpuesto */}
        <div className="absolute inset-x-0 -bottom-16 flex justify-center">
          <div className="relative">
            <UnifiedAvatar 
              src={avatar}
              name={providerName}
              className="h-32 w-32 border-4 border-white shadow-xl ring-4 ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Provider info - centered */}
      <div className="text-center pt-20 pb-4 px-4">
        <h1 className="text-2xl font-bold mb-1">{providerName}</h1>
        <p className="text-lg text-muted-foreground">{serviceTitle}</p>
      </div>
    </>
  );
};

export default ServiceHeroSection;
