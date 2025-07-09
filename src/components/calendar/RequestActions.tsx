
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

  const handleAcceptClick = () => {
    console.log("🔥 ACCEPT BUTTON CLICKED!");
    console.log("Request data:", request);
    console.log("onAccept function:", typeof onAccept);
    
    if (typeof onAccept !== 'function') {
      console.error("❌ onAccept is not a function!");
      return;
    }
    
    try {
      onAccept(request);
      console.log("✅ onAccept called successfully");
    } catch (error) {
      console.error("❌ Error calling onAccept:", error);
    }
  };

  const handleDeclineClick = () => {
    console.log("🔥 DECLINE BUTTON CLICKED!");
    console.log("Request data:", request);
    console.log("onDecline function:", typeof onDecline);
    
    if (typeof onDecline !== 'function') {
      console.error("❌ onDecline is not a function!");
      return;
    }
    
    try {
      onDecline(request);
      console.log("✅ onDecline called successfully");
    } catch (error) {
      console.error("❌ Error calling onDecline:", error);
    }
  };

  return (
    <div className="flex justify-end gap-2 mt-3">
      <Button 
        onClick={handleDeclineClick}
        variant="outline"
        size="sm"
        className="flex items-center border-red-200 hover:bg-red-50 text-red-600"
      >
        <X className="w-4 h-4 mr-1" /> Rechazar{isGroup ? ' Serie' : ''}
      </Button>
      <Button 
        onClick={handleAcceptClick}
        size="sm"
        className="flex items-center bg-green-600 hover:bg-green-700"
      >
        <Check className="w-4 h-4 mr-1" /> Aceptar{isGroup ? ' Serie' : ''}
      </Button>
    </div>
  );
};

export default RequestActions;
