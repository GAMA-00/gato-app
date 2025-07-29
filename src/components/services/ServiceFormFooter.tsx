
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
  isSubmitting?: boolean;
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
  onSubmit,
  isSubmitting = false
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
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Indicador de progreso */}
      <div className="flex justify-between items-center">
        <div className="text-sm sm:text-base text-stone-600 font-medium">
          Paso {currentStep + 1} de {totalSteps}
        </div>
        <div className="flex space-x-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-stone-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Botones de navegación */}
      <div className="flex gap-3 sm:gap-4">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            className="flex-1 h-12 sm:h-11 text-sm sm:text-base min-w-0"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="truncate">Anterior</span>
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className={`${isFirstStep ? "flex-1" : "flex-1"} h-12 sm:h-11 text-sm sm:text-base min-w-0`}
          size="sm"
        >
          <X className="h-4 w-4 mr-2" />
          <span className="truncate">Cancelar</span>
        </Button>
        
        {!isLastStep ? (
          <Button 
            type="button"
            onClick={onNext}
            className="flex-1 h-12 sm:h-11 text-sm sm:text-base min-w-0"
            size="sm"
          >
            <span className="truncate">Siguiente</span>
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleSubmitClick}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700 h-12 sm:h-11 disabled:opacity-50 text-sm sm:text-base min-w-0"
            size="sm"
          >
            <Check className="h-4 w-4 mr-2" />
            <span className="truncate">
              {isSubmitting ? 'Enviando...' : (isEditing ? 'Guardar' : 'Crear')}
            </span>
          </Button>
        )}
      </div>

      {/* Botón de eliminar separado */}
      {isEditing && onDelete && initialData && isLastStep && (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="w-full h-12 sm:h-11 text-sm sm:text-base"
          size="sm"
        >
          <Trash className="h-4 w-4 mr-2" /> 
          <span>Eliminar Servicio</span>
        </Button>
      )}
    </div>
  );
};

export default ServiceFormFooter;
