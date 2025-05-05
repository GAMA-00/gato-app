
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
import { Service, ServiceVariant } from '@/lib/types';
import ServiceFormFields from './ServiceFormFields';
import ServiceFormFooter from './ServiceFormFooter';

// Schema definitions for validation
const serviceFormSchema = z.object({
  name: z.string().min(2, { message: 'Service name must be at least 2 characters.' }),
  subcategoryId: z.string().min(1, { message: 'Debe seleccionar una subcategoría.' }),
  description: z.string().optional(),
  residenciaIds: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos una residencia.' }),
  // Nuevos campos para el perfil del proveedor
  aboutMe: z.string().optional(),
  profileImage: z.any().optional(),
  galleryImages: z.array(z.any()).optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  hasCertifications: z.boolean().optional(),
  handlesDangerousDogs: z.boolean().optional(),
  serviceVariants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, { message: 'El nombre del servicio es obligatorio' }),
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
      description: initialData.description,
      residenciaIds: initialData.residenciaIds,
      aboutMe: initialData.aboutMe || '',
      experienceYears: initialData.experienceYears || 0,
      hasCertifications: initialData.hasCertifications || false,
      handlesDangerousDogs: initialData.handlesDangerousDogs || false,
      serviceVariants: initialData.serviceVariants || [
        { name: 'Servicio básico', price: initialData.price, duration: initialData.duration }
      ]
    } : {
      name: '',
      subcategoryId: '',
      description: '',
      residenciaIds: [],
      aboutMe: '',
      experienceYears: 0,
      hasCertifications: false,
      handlesDangerousDogs: false,
      serviceVariants: [
        { name: 'Servicio básico', price: 50, duration: 60 }
      ]
    }
  });
  
  const handleSubmit = (values: ServiceFormValues) => {
    // Ensure serviceVariants meets the ServiceVariant interface requirements
    const formattedServiceVariants: ServiceVariant[] = values.serviceVariants?.map(variant => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      duration: variant.duration
    })) || [];

    // Extract price and duration from first service variant for base values
    const baseVariant = formattedServiceVariants[0] || { price: 0, duration: 0 };
    const basePrice = Number(baseVariant.price);
    const baseDuration = Number(baseVariant.duration);

    onSubmit({
      ...initialData,
      ...values,
      // Add these fields for compatibility with existing code
      price: basePrice,
      duration: baseDuration,
      serviceVariants: formattedServiceVariants
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
