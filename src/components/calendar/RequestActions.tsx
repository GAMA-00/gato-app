
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface RequestActionsProps {
  request: any;
  onAccept: (request: any) => void;
  onDecline: (request: any) => void;
}

const RequestActions: React.FC<RequestActionsProps> = ({ request, onAccept, onDecline }) => {
  const isGroup = request.appointment_count > 1;

  return (
    <div className="flex justify-end gap-2 mt-3">
      <Button 
        onClick={() => onDecline(request)}
        variant="outline"
        size="sm"
        className="flex items-center border-red-200 hover:bg-red-50 text-red-600"
      >
        <X className="w-4 h-4 mr-1" /> Rechazar{isGroup ? ' Serie' : ''}
      </Button>
      <Button 
        onClick={() => onAccept(request)}
        size="sm"
        className="flex items-center bg-green-600 hover:bg-green-700"
      >
        <Check className="w-4 h-4 mr-1" /> Aceptar{isGroup ? ' Serie' : ''}
      </Button>
    </div>
  );
};

export default RequestActions;
