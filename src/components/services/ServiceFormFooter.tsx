
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
  const isMobile = useIsMobile();
  
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
    }
  };
  
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  
  const handleSubmitClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir comportamiento por defecto
    console.log("Submit button clicked");
    onSubmit();
  };
  
  return (
    <div className="w-full space-y-3">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm text-muted-foreground">
          Paso {currentStep + 1} de {totalSteps}
        </div>
      </div>

      {/* Botones de navegación en línea horizontal */}
      <div className="flex gap-2 w-full">
        {!isFirstStep && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrev}
            className="flex-1"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className={isFirstStep ? "flex-1" : "flex-1"}
          size="sm"
        >
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        
        {!isLastStep ? (
          <Button 
            type="button"
            onClick={onNext}
            className="flex-1"
            size="sm"
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button 
            type="button"
            onClick={handleSubmitClick}
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Check className="h-4 w-4 mr-1" />
            {isEditing ? 'Guardar' : 'Crear'}
          </Button>
        )}
      </div>

      {/* Botón de eliminar separado debajo si estamos editando y en el último paso */}
      {isEditing && onDelete && initialData && isLastStep && (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="w-full mt-2"
          size="sm"
        >
          <Trash className="h-4 w-4 mr-2" /> 
          Eliminar Servicio
        </Button>
      )}
    </div>
  );
};

export default ServiceFormFooter;
