
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface RequestActionsProps {
  request: any;
  onAccept: (request: any) => void;
  onDecline: (request: any) => void;
  isLoading?: boolean;
}

const RequestActions: React.FC<RequestActionsProps> = ({ request, onAccept, onDecline, isLoading = false }) => {
  const isGroup = request.appointment_count > 1;

  const handleAcceptClick = () => {
    console.log("🟢 BUTTON: Accept button clicked for request:", request.id);
    console.log("🟢 BUTTON: Request details:", request);
    onAccept(request);
  };

  const handleDeclineClick = () => {
    console.log("🔴 BUTTON: Decline button clicked for request:", request.id);
    console.log("🔴 BUTTON: Request details:", request);
    onDecline(request);
  };

  return (
    <div className="flex justify-end gap-2 mt-3">
      <Button 
        onClick={handleDeclineClick}
        variant="outline"
        size="sm"
        disabled={isLoading}
        className="flex items-center border-red-200 hover:bg-red-50 text-red-600 disabled:opacity-50"
      >
        <X className="w-4 h-4 mr-1" /> 
        {isLoading ? 'Procesando...' : `Rechazar${isGroup ? ' Serie' : ''}`}
      </Button>
      <Button 
        onClick={handleAcceptClick}
        size="sm"
        disabled={isLoading}
        className="flex items-center bg-green-600 hover:bg-green-700 disabled:opacity-50"
      >
        <Check className="w-4 h-4 mr-1" /> 
        {isLoading ? 'Procesando...' : `Aceptar${isGroup ? ' Serie' : ''}`}
      </Button>
    </div>
  );
};

export default RequestActions;
