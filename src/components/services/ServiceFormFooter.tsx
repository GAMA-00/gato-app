
import React from 'react';
import { Trash, Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Service } from '@/lib/types';

interface ServiceFormFooterProps {
  isEditing: boolean;
  onDelete?: (service: Service) => void;
  initialData?: Service;
  onCancel: () => void;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}

const ServiceFormFooter: React.FC<ServiceFormFooterProps> = ({
  isEditing,
  onDelete,
  initialData,
  onCancel,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSubmit
}) => {
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
    }
  };
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  const handleSubmitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Submit button clicked");
    onSubmit();
  };
  
  return (
    <div className="w-full space-y-4">
      {/* Indicador de progreso */}
      <div className="flex justify-between items-center">
        <div className="text-xs sm:text-sm text-muted-foreground">
          Paso {currentStep + 1} de {totalSteps}
        </div>
        <div className="flex space-x-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex gap-2 sm:gap-3">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            className="flex-1 h-10 sm:h-11"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">Anterior</span>
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className={`${isFirstStep ? "flex-1" : "flex-1"} h-10 sm:h-11`}
          size="sm"
        >
          <X className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">Cancelar</span>
        </Button>
        
        {!isLastStep ? (
          <Button 
            type="button"
            onClick={onNext}
            className="flex-1 h-10 sm:h-11"
            size="sm"
          >
            <span className="text-xs sm:text-sm">Siguiente</span>
            <ArrowRight className="h-4 w-4 ml-1 sm:ml-2" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleSubmitClick}
            className="flex-1 bg-green-600 hover:bg-green-700 h-10 sm:h-11"
            size="sm"
          >
            <Check className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">{isEditing ? 'Guardar' : 'Crear'}</span>
          </Button>
        )}
      </div>

      {/* Botón de eliminar separado */}
      {isEditing && onDelete && initialData && isLastStep && (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="w-full h-10 sm:h-11"
          size="sm"
        >
          <Trash className="h-4 w-4 mr-2" /> 
          <span className="text-xs sm:text-sm">Eliminar Servicio</span>
        </Button>
      )}
    </div>
  );
};

export default ServiceFormFooter;
