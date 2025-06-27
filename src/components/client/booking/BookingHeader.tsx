
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BookingHeaderProps {
  onBackClick: () => void;
}

const BookingHeader = ({ onBackClick }: BookingHeaderProps) => {
  return (
    <div className="w-full mb-6">
      <Button 
        variant="ghost" 
        onClick={onBackClick}
        className="mb-2 p-0 h-auto text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>
      
      {/* Centered Title */}
      <h1 className="text-2xl md:text-3xl font-bold text-luxury-navy mb-6 text-center">
        Reservar Servicio
      </h1>
    </div>
  );
};

export default BookingHeader;
