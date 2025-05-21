
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
    <div className="w-full space-y-3">
      {isEditing && onDelete && initialData && isLastStep ? (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="w-full"
        >
          <Trash className="h-4 w-4 mr-2" /> 
          Eliminar Servicio
        </Button>
      ) : null}
      
      <div className="flex flex-col gap-2 w-full">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        
        {!isLastStep ? (
          <Button 
            type="button"
            onClick={onNext}
            className="w-full"
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button 
            type="submit"
            className="w-full"
          >
            <Check className="h-4 w-4 mr-2" />
            {isEditing ? 'Guardar Cambios' : 'Crear Servicio'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServiceFormFooter;
