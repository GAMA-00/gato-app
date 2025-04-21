
import React from 'react';
import { Trash, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Service } from '@/lib/types';

interface ServiceFormFooterProps {
  isEditing: boolean;
  onDelete?: (service: Service) => void;
  initialData?: Service;
  onCancel: () => void;
}

const ServiceFormFooter: React.FC<ServiceFormFooterProps> = ({
  isEditing,
  onDelete,
  initialData,
  onCancel
}) => {
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
    }
  };
  
  return (
    <DialogFooter className="flex justify-between items-center w-full border-t pt-6 mt-6">
      <div className="flex gap-2 w-full">
        {isEditing && onDelete && initialData ? (
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            className="mr-auto"
          >
            <Trash className="h-4 w-4 mr-2" /> 
            Eliminar Servicio
          </Button>
        ) : <div />}
        
        <div className="flex gap-2 ml-auto">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="min-w-[120px]"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit"
            className="min-w-[120px]"
          >
            <Check className="h-4 w-4 mr-2" />
            {isEditing ? 'Guardar Cambios' : 'Crear Servicio'}
          </Button>
        </div>
      </div>
    </DialogFooter>
  );
};

export default ServiceFormFooter;
