
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
import { Service, ServiceVariant, WeeklyAvailability, CustomVariableGroup } from '@/lib/types';
import ServiceFormFields from './ServiceFormFields';
import ServiceFormFooter from './ServiceFormFooter';
import { toast } from 'sonner';

// Schema definitions for validation con soporte para post-pago
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
  // Nuevo campo para servicios post-pago
  isPostPayment: z.boolean().optional(),
  serviceVariants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().min(1, { message: 'El nombre del servicio es obligatorio' }),
      price: z.union([z.string(), z.number()]),
      duration: z.union([z.string(), z.number()])
    })
  ).optional(),
  // Campos para variables personalizadas
  useCustomVariables: z.boolean().optional(),
  customVariableGroups: z.array(z.any()).optional(),
  // Nueva sección de disponibilidad
  availability: z.record(z.object({
    enabled: z.boolean().optional(),
    timeSlots: z.array(z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional()
    })).optional()
  })).optional()
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
  const steps = ['basic', 'profile', 'service', 'availability'];
  
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
      isPostPayment: initialData.isPostPayment || false,
      serviceVariants: initialData.serviceVariants || [
        { name: 'Servicio básico', price: initialData.price, duration: initialData.duration }
      ],
      availability: initialData.availability || {},
      useCustomVariables: initialData.useCustomVariables || false,
      customVariableGroups: initialData.customVariableGroups || []
    } : {
      name: '',
      subcategoryId: '',
      description: '',
      residenciaIds: [],
      aboutMe: '',
      experienceYears: 0,
      hasCertifications: false,
      certificationFiles: [],
      isPostPayment: false,
      serviceVariants: [
        { name: 'Servicio básico', price: 50, duration: 60 }
      ],
      availability: {},
      useCustomVariables: false,
      customVariableGroups: []
    }
  });
  
  // Transform availability data to match WeeklyAvailability interface
  const transformAvailability = (formAvailability: ServiceFormValues['availability']): WeeklyAvailability => {
    if (!formAvailability) return {};
    
    const transformed: WeeklyAvailability = {};
    
    Object.entries(formAvailability).forEach(([day, dayData]) => {
      if (dayData && dayData.enabled !== undefined) {
        transformed[day] = {
          enabled: dayData.enabled,
          timeSlots: (dayData.timeSlots || []).filter(slot => 
            slot?.startTime && slot?.endTime
          ).map(slot => ({
            startTime: slot!.startTime!,
            endTime: slot!.endTime!
          }))
        };
      }
    });
    
    return transformed;
  };
  
  const handleSubmit = (values: ServiceFormValues) => {
    console.log("=== FORMULARIO ENVIADO ===");
    console.log("Valores del formulario:", values);
    
    try {
      // Validar datos requeridos
      if (!values.name) {
        console.error("Error: Nombre del servicio requerido");
        toast.error("El nombre del servicio es obligatorio");
        return;
      }
      
      if (!values.subcategoryId) {
        console.error("Error: Subcategoría requerida");
        toast.error("Debe seleccionar una subcategoría");
        return;
      }
      
      if (!values.residenciaIds || values.residenciaIds.length === 0) {
        console.error("Error: Residencias requeridas");
        toast.error("Debe seleccionar al menos una residencia");
        return;
      }
      
      // Ensure serviceVariants meets the ServiceVariant interface requirements
      const formattedServiceVariants: ServiceVariant[] = values.serviceVariants?.map(variant => ({
        id: variant.id,
        name: variant.name,
        price: values.isPostPayment ? 0 : variant.price, // Precio 0 para post-pago
        duration: variant.duration
      })) || [];

      // Extract price and duration from first service variant for base values
      const baseVariant = formattedServiceVariants[0] || { price: 0, duration: 0 };
      const basePrice = values.isPostPayment ? 0 : Number(baseVariant.price);
      const baseDuration = Number(baseVariant.duration);
      
      console.log("Variantes formateadas:", formattedServiceVariants);
      console.log("Precio base:", basePrice);
      console.log("Duración base:", baseDuration);
      console.log("Es post-pago:", values.isPostPayment);

      // Transform availability to match WeeklyAvailability interface
      const transformedAvailability = transformAvailability(values.availability);
      console.log("Disponibilidad transformada:", transformedAvailability);

      const serviceData: Partial<Service> = {
        ...initialData,
        ...values,
        // Add these fields for compatibility with existing code
        price: basePrice,
        duration: baseDuration,
        serviceVariants: formattedServiceVariants,
        availability: transformedAvailability,
        isPostPayment: values.isPostPayment || false,
        useCustomVariables: values.useCustomVariables || false,
        customVariableGroups: values.customVariableGroups || []
      };
      
      console.log("Datos finales a enviar:", serviceData);

      onSubmit(serviceData);
      
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
    console.log("=== INTENTANDO ENVIAR FORMULARIO ===");
    console.log("Valores actuales:", form.getValues());
    
    // Validar el formulario manualmente antes de enviarlo
    form.trigger().then(isValid => {
      console.log("Resultado de validación:", isValid);
      console.log("Errores de validación:", form.formState.errors);
      
      if (isValid) {
        // Si es válido, enviar el formulario
        const values = form.getValues();
        handleSubmit(values);
      } else {
        // Si no es válido, mostrar un mensaje de error
        console.error("Formulario inválido:", form.formState.errors);
        toast.error("Por favor completa todos los campos obligatorios");
      }
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl max-h-[95vh] h-[95vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl font-semibold">
            {initialData ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600">
            {initialData 
              ? 'Realiza los cambios necesarios en tu anuncio.' 
              : 'Completa la información para crear un nuevo anuncio.'}
          </DialogDescription>
        </DialogHeader>
        
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={(e) => {
              e.preventDefault();
              console.log("=== EVENTO onSubmit DEL FORM ===");
              const values = form.getValues();
              handleSubmit(values);
            }} className="flex flex-col flex-1 min-h-0">
              {/* Contenido principal con scroll mejorado */}
              <div className="flex-1 overflow-hidden px-4 sm:px-6">
                <ScrollArea className="h-full">
                  <div className="py-6 pr-4">
                    <ServiceFormFields currentStep={currentStep} />
                  </div>
                </ScrollArea>
              </div>
              
              {/* Footer fijo */}
              <div className="flex-shrink-0 border-t border-gray-100 bg-white px-4 sm:px-6 py-4">
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
