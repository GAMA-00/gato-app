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
    <div className="bg-background pt-3 pb-1 px-4">
      {/* Avatar centered */}
      <div className="flex justify-center mb-2">
        <UnifiedAvatar 
          src={avatar}
          name={providerName}
          className="h-16 w-16 border-2 border-white shadow-lg ring-2 ring-primary"
        />
      </div>

      {/* Provider info - centered */}
      <div className="text-center">
        <h1 className="text-lg font-bold mb-0">{providerName}</h1>
        <p className="text-sm text-muted-foreground">{serviceTitle}</p>
      </div>
    </div>
  );
};

export default ServiceHeroSection;
