
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { logger } from '@/utils/logger';

interface RequestActionsProps {
  request: any;
  onAccept: (request: any) => void;
  onDecline: (request: any) => void;
  isLoading?: boolean;
}

const RequestActions: React.FC<RequestActionsProps> = ({ request, onAccept, onDecline, isLoading = false }) => {
  const isGroup = request.appointment_count > 1;

  const handleAcceptClick = () => {
    logger.debug("Accept button clicked for request:", request.id);
    logger.debug("Request details:", request);
    onAccept(request);
  };

  const handleDeclineClick = () => {
    logger.debug("Decline button clicked for request:", request.id);
    logger.debug("Request details:", request);
    onDecline(request);
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Button 
        onClick={handleAcceptClick}
        size="lg"
        disabled={isLoading}
        className="w-full h-11 flex items-center justify-center font-medium disabled:opacity-50"
        style={{ 
          backgroundColor: '#10B981', 
          color: 'white',
          borderRadius: '0.5rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
      >
        <Check className="w-4 h-4 mr-2" /> 
        {isLoading ? 'Procesando...' : `Aceptar${isGroup ? ' Serie' : ''}`}
      </Button>
      <Button 
        onClick={handleDeclineClick}
        variant="outline"
        size="lg"
        disabled={isLoading}
        className="w-full h-11 flex items-center justify-center font-medium disabled:opacity-50"
        style={{ 
          borderColor: '#EF4444',
          color: '#B91C1C',
          backgroundColor: 'transparent',
          borderRadius: '0.5rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <X className="w-4 h-4 mr-2" /> 
        {isLoading ? 'Procesando...' : `Rechazar${isGroup ? ' Serie' : ''}`}
      </Button>
    </div>
  );
};

export default RequestActions;
