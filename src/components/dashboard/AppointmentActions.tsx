
import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppointmentActionsProps {
  appointmentId: string;
  onAccept: (appointmentId: string) => Promise<void>;
  onReject: (appointmentId: string) => Promise<void>;
}

const AppointmentActions: React.FC<AppointmentActionsProps> = ({
  appointmentId,
  onAccept,
  onReject
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-3">
      <Button 
        onClick={() => onReject(appointmentId)} 
        size="sm" 
        variant="outline" 
        className="flex items-center"
      >
        <X className="h-4 w-4 mr-1" />
        Rechazar
      </Button>
      <Button 
        onClick={() => onAccept(appointmentId)} 
        size="sm" 
        variant="default" 
        className="flex items-center"
      >
        <Check className="h-4 w-4 mr-1" />
        Aceptar
      </Button>
    </div>
  );
};

export default AppointmentActions;
