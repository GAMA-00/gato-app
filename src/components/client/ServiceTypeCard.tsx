import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { getServiceTypeIcon } from '@/utils/serviceIconUtils';
import { toast } from 'sonner';

interface ServiceType {
  id: string;
  name: string;
}

interface ServiceTypeCardProps {
  serviceType: ServiceType;
  categoryId: string;
  categoryLabel: string;
  hasProviders?: boolean;
}

const ServiceTypeCard = ({ serviceType, categoryId, categoryLabel, hasProviders = true }: ServiceTypeCardProps) => {
  const navigate = useNavigate();
  const serviceIcon = getServiceTypeIcon(serviceType.name, categoryId);

  const handleClick = () => {
    if (!hasProviders) {
      toast.info('Este servicio estará disponible próximamente', {
        description: 'Estamos trabajando para traerte los mejores proveedores.'
      });
      return;
    }
    navigate(`/client/results?serviceId=${serviceType.id}&categoryName=${encodeURIComponent(categoryLabel)}`);
  };

  return (
    <Card 
      className={`p-4 transition-all cursor-pointer bg-white border border-gray-100 relative overflow-hidden ${
        hasProviders ? 'hover:shadow-lg' : 'opacity-90'
      }`}
      onClick={handleClick}
    >
      {/* Distintivo "Próximamente" */}
      {!hasProviders && (
        <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
          <div 
            className="absolute transform rotate-45 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] font-semibold py-1 text-center shadow-md"
            style={{
              right: '-32px',
              top: '18px',
              width: '120px',
            }}
          >
            Próximamente
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-24 h-24 bg-luxury-navy rounded-full flex items-center justify-center">
          {serviceIcon.type === 'image' ? (
            <img 
              src={serviceIcon.src} 
              alt={serviceType.name}
              className="w-20 h-20 object-contain"
              loading="lazy"
              decoding="async"
              style={{ imageRendering: 'crisp-edges' }}
            />
          ) : (
            React.createElement(serviceIcon.component!, {
              className: "h-12 w-12 text-white"
            })
          )}
        </div>
        <div>
          <h3 className="font-medium text-sm text-gray-900 mb-1">
            {serviceType.name === 'Floristería' ? 'Flores' : serviceType.name}
          </h3>
        </div>
      </div>
    </Card>
  );
};

export default ServiceTypeCard;
