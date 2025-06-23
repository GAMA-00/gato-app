
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { getServiceTypeIcon } from '@/utils/serviceIconUtils';

interface ServiceType {
  id: string;
  name: string;
}

interface ServiceTypeCardProps {
  serviceType: ServiceType;
  categoryId: string;
  categoryLabel: string;
}

const ServiceTypeCard = ({ serviceType, categoryId, categoryLabel }: ServiceTypeCardProps) => {
  const navigate = useNavigate();
  const serviceIcon = getServiceTypeIcon(serviceType.name, categoryId);

  const handleClick = () => {
    navigate(`/client/results?serviceId=${serviceType.id}&categoryName=${encodeURIComponent(categoryLabel)}`);
  };

  return (
    <Card 
      className="p-4 hover:shadow-lg transition-all cursor-pointer bg-white border border-gray-100"
      onClick={handleClick}
    >
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
          <h3 className="font-medium text-sm text-gray-900 mb-1">{serviceType.name}</h3>
        </div>
      </div>
    </Card>
  );
};

export default ServiceTypeCard;
