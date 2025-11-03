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
    <div className="bg-background pt-4 pb-2 px-4">
      {/* Avatar centered */}
      <div className="flex justify-center mb-3">
        <UnifiedAvatar 
          src={avatar}
          name={providerName}
          className="h-20 w-20 border-3 border-white shadow-lg ring-3 ring-primary"
        />
      </div>

      {/* Provider info - centered */}
      <div className="text-center">
        <h1 className="text-xl font-bold mb-0.5">{providerName}</h1>
        <p className="text-base text-muted-foreground">{serviceTitle}</p>
      </div>
    </div>
  );
};

export default ServiceHeroSection;
