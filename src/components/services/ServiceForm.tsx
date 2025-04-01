
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Service, ServiceCategory } from '@/lib/types';
import ServiceFormFields from './ServiceFormFields';
import ServiceFormFooter from './ServiceFormFooter';

// Schema definitions for validation
const serviceFormSchema = z.object({
  name: z.string().min(2, { message: 'Service name must be at least 2 characters.' }),
  category: z.enum(['cleaning', 'pet-grooming', 'car-wash', 'gardening', 'maintenance', 'other'] as const),
  duration: z.coerce.number().min(15, { message: 'Duration must be at least 15 minutes.' }),
  price: z.coerce.number().min(1, { message: 'Price must be at least $1.' }),
  description: z.string().optional()
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

interface ServiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (service: Partial<Service>) => void;
  initialData?: Service;
  onDelete?: (service: Service) => void;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  onDelete
}) => {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      category: initialData.category,
      duration: initialData.duration,
      price: initialData.price,
      description: initialData.description
    } : {
      name: '',
      category: 'cleaning',
      duration: 60,
      price: 50,
      description: ''
    }
  });
  
  const handleSubmit = (values: ServiceFormValues) => {
    onSubmit({
      ...initialData,
      ...values
    });
    onClose();
  };
  
  const handleDelete = (service: Service) => {
    if (onDelete) {
      onDelete(service);
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Service' : 'Add New Service'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Make changes to your service or delete it.' : 'Add a new service to your offerings.'}
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <ServiceFormFields />
              
              <ServiceFormFooter 
                isEditing={!!initialData}
                onDelete={handleDelete}
                initialData={initialData}
                onCancel={onClose}
              />
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
