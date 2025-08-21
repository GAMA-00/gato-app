
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BasicInfoStep from './steps/BasicInfoStep';
import ProfileStep from './steps/ProfileStep';
import ServiceDetailsStep from './steps/ServiceDetailsStep';
import AvailabilityStep from './steps/AvailabilityStep';
import { Service } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const serviceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  subcategoryId: z.string().min(1, 'La subcategoría es requerida'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  price: z.coerce.number().min(0, 'El precio debe ser mayor a 0'),
  duration: z.coerce.number().min(15, 'La duración debe ser de al menos 15 minutos'),
  isPostPayment: z.union([z.boolean(), z.literal("ambas")]).default(false),
  serviceVariants: z.array(z.any()).min(1, 'Debe tener al menos una variante'),
  residenciaIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una residencia'),
  galleryImages: z.array(z.string()).optional().default([]),
  customVariableGroups: z.array(z.any()).optional().default([]),
  useCustomVariables: z.boolean().optional().default(false),
  availability: z.any().optional(),
  slotPreferences: z.any().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Service>) => void;
  isSubmitting?: boolean;
  initialData?: Service;
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  initialData
}) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      subcategoryId: '',
      description: '',
      price: 0,
      duration: 60,
      isPostPayment: false,
      serviceVariants: [
        { id: uuidv4(), name: '', price: '', duration: 60 }
      ],
      residenciaIds: [],
      galleryImages: [],
      customVariableGroups: [],
      useCustomVariables: false,
      availability: {
        monday: { enabled: false, timeSlots: [] },
        tuesday: { enabled: false, timeSlots: [] },
        wednesday: { enabled: false, timeSlots: [] },
        thursday: { enabled: false, timeSlots: [] },
        friday: { enabled: false, timeSlots: [] },
        saturday: { enabled: false, timeSlots: [] },
        sunday: { enabled: false, timeSlots: [] }
      },
      slotPreferences: {},
    }
  });

  // Precargar datos cuando hay initialData
  useEffect(() => {
    if (initialData) {
      console.log('=== SERVICEFORM: Precargando datos ===');
      console.log('Initial data:', initialData);
      
      // Convert galleryImages from File[] | string[] to string[] for the form
      const processedGalleryImages = initialData.galleryImages ? 
        initialData.galleryImages.map(img => {
          if (typeof img === 'string') {
            return img;
          } else if (img instanceof File) {
            // For File objects, we'd need to convert to URL or handle differently
            // For now, we'll skip File objects in edit mode since they should be URLs from DB
            return '';
          }
          return '';
        }).filter(url => url !== '') : [];
      
      const formValues = {
        name: initialData.name || '',
        subcategoryId: initialData.subcategoryId || '',
        description: initialData.description || '',
        price: Number(initialData.price) || 0,
        duration: Number(initialData.duration) || 60,
        isPostPayment: initialData.isPostPayment || false,
        serviceVariants: initialData.serviceVariants?.length > 0 
          ? initialData.serviceVariants 
          : [{ id: uuidv4(), name: initialData.name || '', price: initialData.price || '', duration: initialData.duration || 60 }],
        residenciaIds: initialData.residenciaIds || [],
        galleryImages: processedGalleryImages,
        customVariableGroups: initialData.customVariableGroups || [],
        useCustomVariables: initialData.useCustomVariables || false,
        availability: initialData.availability || {
          monday: { enabled: false, timeSlots: [] },
          tuesday: { enabled: false, timeSlots: [] },
          wednesday: { enabled: false, timeSlots: [] },
          thursday: { enabled: false, timeSlots: [] },
          friday: { enabled: false, timeSlots: [] },
          saturday: { enabled: false, timeSlots: [] },
          sunday: { enabled: false, timeSlots: [] }
        },
        slotPreferences: initialData.slotPreferences || {},
      };
      
      console.log('Form values to reset:', formValues);
      form.reset(formValues);
    }
  }, [initialData, form]);

  // Scroll to top function
  const scrollToTop = () => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll window to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const steps = [
    { title: 'Información Básica', component: BasicInfoStep },
    { title: 'Perfil', component: ProfileStep },
    { title: 'Detalles del Servicio', component: ServiceDetailsStep },
    { title: 'Disponibilidad', component: AvailabilityStep },
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      // Scroll to top after step change
      setTimeout(scrollToTop, 100);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Scroll to top after step change
      setTimeout(scrollToTop, 100);
    }
  };

  const handleFormSubmit = (data: ServiceFormData) => {
    console.log('=== SERVICEFORM: Submitting form ===');
    console.log('Form data:', data);
    console.log('Form errors:', form.formState.errors);
    
    // Validar que todos los campos requeridos estén presentes
    if (!data.name || !data.subcategoryId || !data.description || !data.serviceVariants?.length) {
      console.error('Missing required fields:', {
        name: !data.name,
        subcategoryId: !data.subcategoryId, 
        description: !data.description,
        serviceVariants: !data.serviceVariants?.length
      });
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }
    
    // Invalidar caches relevantes antes de enviar
    queryClient.invalidateQueries({ queryKey: ['listings'] });
    queryClient.invalidateQueries({ queryKey: ['provider-availability'] });
    queryClient.invalidateQueries({ queryKey: ['provider-slots'] });
    
    onSubmit({
      ...data,
      id: initialData?.id,
      providerId: initialData?.providerId,
      providerName: initialData?.providerName,
      category: initialData?.category,
      createdAt: initialData?.createdAt,
    });
  };

  if (!isOpen) return null;

  const CurrentStepComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div ref={formRef} className="bg-white rounded-lg w-full max-w-4xl my-8">
        <Form {...form}>
          <div className="space-y-6">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {initialData ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}
                </h2>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  ✕
                </Button>
              </div>
              
              {/* Progress */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Paso {currentStep + 1} de {steps.length}</span>
                  <span>{steps[currentStep].title}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 min-h-[400px]">
              <CurrentStepComponent />
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-between rounded-b-lg">
              <Button 
                type="button" 
                variant="outline" 
                onClick={prevStep}
                disabled={isFirstStep || isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                
                {isLastStep ? (
                  <Button 
                    type="button" 
                    disabled={isSubmitting}
                    className="min-w-[120px]"
                    onClick={() => {
                      console.log('Submit button clicked manually');
                      form.handleSubmit(handleFormSubmit)();
                    }}
                  >
                    {isSubmitting ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear')}
                  </Button>
                ) : (
                  <Button type="button" onClick={nextStep}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default ServiceForm;
