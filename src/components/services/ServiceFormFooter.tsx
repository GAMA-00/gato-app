
import React from 'react';
import { Trash } from 'lucide-react';
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
    <DialogFooter className="flex justify-between items-center w-full">
      {isEditing && onDelete && initialData && (
        <Button 
          type="button" 
          variant="destructive" 
          onClick={handleDelete}
          className="mr-auto"
        >
          <Trash className="h-4 w-4 mr-2" /> Delete Service
        </Button>
      )}
      <div className="space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {isEditing ? 'Save Changes' : 'Add Service'}
        </Button>
      </div>
    </DialogFooter>
  );
};

export default ServiceFormFooter;
