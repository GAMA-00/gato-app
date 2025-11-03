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
    <div className="bg-background pt-6 pb-4 px-4">
      {/* Avatar centered */}
      <div className="flex justify-center mb-4">
        <UnifiedAvatar 
          src={avatar}
          name={providerName}
          className="h-24 w-24 border-4 border-white shadow-xl ring-4 ring-primary"
        />
      </div>

      {/* Provider info - centered */}
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-1">{providerName}</h1>
        <p className="text-lg text-muted-foreground">{serviceTitle}</p>
      </div>
    </div>
  );
};

export default ServiceHeroSection;
