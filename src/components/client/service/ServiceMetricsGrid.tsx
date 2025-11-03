import React from 'react';
import { Star, Clock, User } from 'lucide-react';

interface ServiceMetricsGridProps {
  rating: number;
  estimatedTime?: string;
  isNew?: boolean;
}

const ServiceMetricsGrid = ({ 
  rating, 
  estimatedTime = "1-2h", 
  isNew = false 
}: ServiceMetricsGridProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-6 border-b border-stone-200">
      {/* Rating */}
      <div className="flex flex-col items-center gap-1">
        <Star className="h-5 w-5 text-primary fill-primary" />
        <span className="text-lg font-semibold">{rating.toFixed(1)}</span>
      </div>
      
      {/* Tiempo estimado */}
      <div className="flex flex-col items-center gap-1">
        <Clock className="h-5 w-5 text-primary" />
        <span className="text-xs text-muted-foreground text-center">Tiempo</span>
        <span className="text-xs font-medium text-center">{estimatedTime}</span>
      </div>
      
      {/* Badge Nuevo o Estado */}
      <div className="flex flex-col items-center gap-1">
        <User className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">{isNew ? "Nuevo" : "Activo"}</span>
      </div>
    </div>
  );
};

export default ServiceMetricsGrid;
