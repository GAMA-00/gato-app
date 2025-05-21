
import React from 'react';
import { Trash, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Service } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  
  const handleDelete = () => {
    if (initialData && onDelete) {
      onDelete(initialData);
    }
  };
  
  return (
    <DialogFooter className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-3 w-full items-center`}>
      {isEditing && onDelete && initialData ? (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className={isMobile ? 'w-full' : 'mr-auto'}
        >
          <Trash className="h-4 w-4 mr-2" /> 
          Eliminar Servicio
        </Button>
      ) : <div className={isMobile ? 'hidden' : 'block'} />}
      
      <div className={`flex gap-2 ${isMobile ? 'w-full flex-col' : 'ml-auto flex-row'}`}>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className={isMobile ? 'w-full' : 'min-w-[120px]'}
        >
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button 
          type="submit"
          className={isMobile ? 'w-full' : 'min-w-[120px]'}
        >
          <Check className="h-4 w-4 mr-2" />
          {isEditing ? 'Guardar Cambios' : 'Crear Servicio'}
        </Button>
      </div>
    </DialogFooter>
  );
};

export default ServiceFormFooter;
