
import React, { useState } from 'react';
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
import { toast } from 'sonner';

// Schema definitions for validation
const serviceFormSchema = z.object({
  name: z.string().min(2, { message: 'Service name must be at least 2 characters.' }),
  subcategoryId: z.string().min(1, { message: 'Debe seleccionar una subcategoría.' }),
  description: z.string().optional(),
  residenciaIds: z.array(z.string()).min(1, { message: 'Debe seleccionar al menos una residencia.' }),
  // Campos para el perfil del proveedor
  aboutMe: z.string().optional(),
  profileImage: z.any().optional(),
  galleryImages: z.array(z.any()).optional(),
  experienceYears: z.coerce.number().min(0).optional(),
  hasCertifications: z.boolean().optional(),
  certificationFiles: z.array(z.any()).optional(),
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
  // Estado para controlar el paso actual del wizard
  const [currentStep, setCurrentStep] = useState(0);
  const steps = ['basic', 'profile', 'service'];
  
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
      certificationFiles: initialData.certificationFiles || [],
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
      certificationFiles: [],
      serviceVariants: [
        { name: 'Servicio básico', price: 50, duration: 60 }
      ]
    }
  });
  
  const handleSubmit = (values: ServiceFormValues) => {
    console.log("Form submitted with values:", values);
    
    try {
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
      
      toast.success('Formulario enviado correctamente');
      onClose();
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      toast.error('Error al enviar el formulario');
    }
  };
  
  const handleDelete = () => {
    if (onDelete && initialData) {
      onDelete(initialData);
      onClose();
    }
  };
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const submitForm = () => {
    console.log("Submitting form...");
    // Validar el formulario manualmente antes de enviarlo
    form.trigger().then(isValid => {
      console.log("Form validation result:", isValid);
      if (isValid) {
        // Si es válido, enviar el formulario
        form.handleSubmit(handleSubmit)();
      } else {
        // Si no es válido, mostrar un mensaje de error
        console.error("Formulario inválido:", form.formState.errors);
        toast.error("Por favor completa todos los campos obligatorios");
      }
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] h-[95vh] flex flex-col p-0 sm:p-6">
        <DialogHeader className="px-4 pt-6 sm:px-0 sm:pt-0">
          <DialogTitle>{initialData ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}</DialogTitle>
          <DialogDescription>
            {initialData 
              ? 'Realiza los cambios necesarios en tu anuncio.' 
              : 'Completa la información para crear un nuevo anuncio.'}
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("Form onSubmit event triggered");
              form.handleSubmit(handleSubmit)(e);
            }} className="flex flex-col h-full">
              <div className="flex-grow px-4 sm:px-0 overflow-hidden mb-16 mt-2">
                <ScrollArea className="h-[calc(80vh-160px)] pr-4">
                  <div className="py-6 space-y-8">
                    <ServiceFormFields currentStep={currentStep} />
                  </div>
                </ScrollArea>
              </div>
              
              <div className="fixed bottom-0 left-0 right-0 bg-background px-4 py-4 sm:px-6 border-t w-full shadow-sm">
                <ServiceFormFooter 
                  isEditing={!!initialData}
                  onDelete={handleDelete}
                  initialData={initialData}
                  onCancel={onClose}
                  currentStep={currentStep}
                  totalSteps={steps.length}
                  onNext={nextStep}
                  onPrev={prevStep}
                  onSubmit={submitForm}
                />
              </div>
            </form>
          </Form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceForm;
