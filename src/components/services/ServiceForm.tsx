
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form } from '@/components/ui/form';
import { Service, ServiceSize } from '@/lib/types';
import ServiceFormFields from './ServiceFormFields';
import ServiceFormFooter from './ServiceFormFooter';

// Schema definitions for validation
const serviceFormSchema = z.object({
  name: z.string().min(2, { message: 'Service name must be at least 2 characters.' }),
  subcategoryId: z.string().min(1, { message: 'Debe seleccionar una subcategoría.' }),
  duration: z.coerce.number().min(15, { message: 'Duration must be at least 15 minutes.' }),
  price: z.coerce.number().min(1, { message: 'Price must be at least $1.' }),
  description: z.string().optional(),
  residenciaIds: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos una residencia.' }),
  // Nuevos campos para el perfil del proveedor
  aboutMe: z.string().optional(),
  profileImage: z.any().optional(),
  galleryImages: z.array(z.any()).optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  hasCertifications: z.boolean().optional(),
  handlesDangerousDogs: z.boolean().optional(),
  serviceSizes: z.array(
    z.object({
      size: z.string(),
      price: z.union([z.string(), z.number()]),
      duration: z.union([z.string(), z.number()])
    })
  ).optional()
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
      subcategoryId: initialData.subcategoryId,
      duration: initialData.duration,
      price: initialData.price,
      description: initialData.description,
      residenciaIds: initialData.residenciaIds,
      aboutMe: initialData.aboutMe || '',
      experienceYears: initialData.experienceYears || 0,
      hasCertifications: initialData.hasCertifications || false,
      handlesDangerousDogs: initialData.handlesDangerousDogs || false,
      serviceSizes: initialData.serviceSizes || [
        { size: 'Pequeño', price: '', duration: 30 },
        { size: 'Mediano', price: '', duration: 45 },
        { size: 'Grande', price: '', duration: 60 },
        { size: 'Gigante', price: '', duration: 90 }
      ]
    } : {
      name: '',
      subcategoryId: '',
      duration: 60,
      price: 50,
      description: '',
      residenciaIds: [],
      aboutMe: '',
      experienceYears: 0,
      hasCertifications: false,
      handlesDangerousDogs: false,
      serviceSizes: [
        { size: 'Pequeño', price: '', duration: 30 },
        { size: 'Mediano', price: '', duration: 45 },
        { size: 'Grande', price: '', duration: 60 },
        { size: 'Gigante', price: '', duration: 90 }
      ]
    }
  });
  
  const handleSubmit = (values: ServiceFormValues) => {
    // Ensure serviceSizes meets the ServiceSize interface requirements
    const formattedServiceSizes: ServiceSize[] = values.serviceSizes?.map(size => ({
      size: size.size,
      price: size.price,
      duration: size.duration
    })) || [];

    onSubmit({
      ...initialData,
      ...values,
      serviceSizes: formattedServiceSizes
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
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Realiza los cambios necesarios en tu anuncio.' 
              : 'Completa la información para crear un nuevo anuncio.'}
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
              <ScrollArea className="flex-grow px-1">
                <div className="space-y-6 pb-6">
                  <ServiceFormFields />
                </div>
              </ScrollArea>
              
              <ServiceFormFooter 
                isEditing={!!initialData}
                onDelete={onDelete}
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
