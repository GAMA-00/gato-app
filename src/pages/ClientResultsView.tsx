
import React from 'react';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import BackButton from '@/components/ui/back-button';
import ProvidersList from '@/components/client/results/ProvidersList';
import { useIsMobile } from '@/hooks/use-mobile';

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  console.log("ClientResultsView rendered with params:", { categoryName, serviceId });
  
  const handleBack = () => {
    navigate(`/client/category/${categoryName}`);
  };
  
  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Back button positioned absolutely flush with screen edge */}
      <div className="absolute top-4 left-0 z-10 pl-4">
        <BackButton onClick={handleBack} />
      </div>

      {/* Main content with optimized mobile spacing */}
      <div className={`pt-20 px-4 pb-24 ${isMobile ? 'pt-16' : 'pt-20'}`}>
        <div className="w-full">
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className={`font-bold tracking-tight text-app-text ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              Profesionales disponibles
            </h1>
          </div>
          
          {/* Providers List - Full width container */}
          <div className="w-full max-w-none">
            <ProvidersList 
              categoryName={categoryName || ''}
              serviceId={serviceId || ''}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientResultsView;
