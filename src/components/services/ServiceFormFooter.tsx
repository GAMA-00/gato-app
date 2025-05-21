
import React from 'react';
import { Trash, Check, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Service } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface ServiceFormFooterProps {
  isEditing: boolean;
  onDelete?: (service: Service) => void;
  initialData?: Service;
  onCancel: () => void;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
}

const ServiceFormFooter: React.FC<ServiceFormFooterProps> = ({
  isEditing,
  onDelete,
  initialData,
  onCancel,
  currentStep,
  totalSteps,
  onNext,
  onPrev
}) => {
  const isMobile = useIsMobile();
  
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
    }
  };
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  return (
    <div className="w-full space-y-4"> {/* Increased spacing between button groups */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Paso {currentStep + 1} de {totalSteps}
        </div>
      </div>

      {isEditing && onDelete && initialData && isLastStep ? (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="w-full h-12" // Increased button height
        >
          <Trash className="h-5 w-5 mr-2" /> 
          Eliminar Servicio
        </Button>
      ) : null}
      
      <div className="grid gap-3 w-full"> {/* Increased gap for better spacing */}
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            className="w-full h-12" // Increased button height
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Anterior
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="w-full h-12" // Increased button height
        >
          <X className="h-5 w-5 mr-2" />
          Cancelar
        </Button>
        
        {!isLastStep ? (
          <Button 
            type="button"
            onClick={onNext}
            className="w-full h-12" // Increased button height
          >
            Siguiente
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        ) : (
          <Button 
            type="submit"
            className="w-full h-12" // Increased button height
          >
            <Check className="h-5 w-5 mr-2" />
            {isEditing ? 'Guardar Cambios' : 'Crear Servicio'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServiceFormFooter;
