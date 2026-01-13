
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
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useServiceFormSync } from '@/hooks/useServiceFormSync';

// Wrapper component to use sync hook inside form context
const ServiceFormSyncWrapper: React.FC<{ listingId?: string }> = ({ listingId }) => {
  useServiceFormSync(listingId);
  return null;
};

const serviceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  subcategoryId: z.string().min(1, 'La subcategoría es requerida'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  price: z.coerce.number().min(0, 'El precio debe ser mayor a 0'),
  duration: z.coerce.number().min(2, 'La duración debe ser de al menos 2 minutos'),
  currency: z.enum(['USD', 'CRC']).default('USD'),
  isPostPayment: z.union([z.boolean(), z.literal("ambas")]).default(false),
  slotSize: z.coerce.number().refine((val) => val === 30 || val === 60, {
    message: 'El tamaño de slot debe ser 30 o 60 minutos'
  }).default(60),
  serviceVariants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'El nombre del servicio es requerido'),
    price: z.union([z.string(), z.coerce.number()]).refine((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num > 0;
    }, 'El precio debe ser mayor a 0'),
    duration: z.union([z.string(), z.coerce.number()]).refine((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(num) && num >= 2;
    }, 'La duración debe ser de al menos 2 minutos'),
    customVariables: z.array(z.any()).optional().default([]),
    additionalPersonPrice: z.union([z.string(), z.coerce.number()]).optional(),
    maxPersons: z.union([z.string(), z.coerce.number()]).optional()
  })).min(1, 'Debe tener al menos una variante'),
  residenciaIds: z.array(z.string()).min(1, 'Debe seleccionar al menos una residencia'),
  galleryImages: z.array(z.union([z.string(), z.instanceof(File)])).optional().default([]),
  customVariableGroups: z.array(z.any()).optional().default([]),
  useCustomVariables: z.boolean().optional().default(false),
  availability: z.any().optional(),
  slotPreferences: z.object({
    minNoticeHours: z.coerce.number().min(0).max(168).default(0).optional(),
    serviceRequirements: z.string().max(1000).optional(),
  }).optional(),
  aboutMe: z.string().optional(),
  experienceYears: z.union([z.string(), z.coerce.number()]).optional(),
  hasCertifications: z.boolean().optional(),
  certificationFiles: z.array(z.any()).optional().default([]),
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
      currency: 'USD',
      isPostPayment: false,
      slotSize: 60,
      serviceVariants: [
        { id: uuidv4(), name: '', price: '', duration: 60, customVariables: [] }
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
      slotPreferences: {
        minNoticeHours: 0,
        serviceRequirements: ''
      },
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
        currency: initialData.currency || 'USD',
        isPostPayment: initialData.isPostPayment || false,
        slotSize: (Number(initialData.slotSize) === 30 ? 30 : 60) as 30 | 60,
        serviceVariants: initialData.serviceVariants?.length > 0 
          ? initialData.serviceVariants.map(variant => ({
              id: variant.id || uuidv4(),
              name: variant.name || '',
              price: variant.price || '',
              duration: variant.duration || 60,
              customVariables: variant.customVariables || [],
              additionalPersonPrice: variant.additionalPersonPrice,
              maxPersons: variant.maxPersons
            }))
          : [{ id: uuidv4(), name: initialData.name || '', price: initialData.price || '', duration: initialData.duration || 60, customVariables: [] }],
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
        slotPreferences: {
          minNoticeHours: initialData.slotPreferences?.minNoticeHours ?? 0,
          serviceRequirements: initialData.slotPreferences?.serviceRequirements ?? '',
          ...initialData.slotPreferences
        },
        
        // Campos del perfil profesional
        aboutMe: initialData.aboutMe || '',
        experienceYears: initialData.experienceYears || 0,
        hasCertifications: initialData.hasCertifications || false,
        certificationFiles: initialData.certificationFiles || [],
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
    console.log('Form isValid:', form.formState.isValid);
    console.log('Form isSubmitting:', form.formState.isSubmitting);
    
    // Validar que todos los campos requeridos estén presentes
    if (!data.name || !data.subcategoryId || !data.description || !data.serviceVariants?.length) {
      console.error('Missing required fields:', {
        name: !data.name,
        subcategoryId: !data.subcategoryId, 
        description: !data.description,
        serviceVariants: !data.serviceVariants?.length
      });
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor completa todos los campos requeridos"
      });
      return;
    }
    
    // Validar residenciaIds específicamente
    if (!data.residenciaIds || data.residenciaIds.length === 0) {
      console.error('No residencias selected');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe seleccionar al menos una residencia"
      });
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
      serviceVariants: data.serviceVariants.map(variant => ({
        id: variant.id || uuidv4(),
        name: variant.name,
        price: variant.price,
        duration: variant.duration,
        customVariables: variant.customVariables || [],
        additionalPersonPrice: variant.additionalPersonPrice,
        maxPersons: variant.maxPersons
      })) as any,
    } as Partial<Service>);
  };

  // Watch required fields for real-time validation indicator
  const watchedValues = form.watch(['name', 'subcategoryId', 'description', 'serviceVariants', 'residenciaIds']);

  // Function to get list of incomplete required fields
  const getIncompleteRequiredFields = (): string[] => {
    const values = form.getValues();
    const incompleteFields: string[] = [];
    
    if (!values.name || values.name.trim() === '') {
      incompleteFields.push('Nombre del servicio');
    }
    if (!values.subcategoryId) {
      incompleteFields.push('Categoría del servicio');
    }
    if (!values.description || values.description.length < 10) {
      incompleteFields.push('Descripción (mín. 10 caracteres)');
    }
    if (!values.serviceVariants || values.serviceVariants.length === 0) {
      incompleteFields.push('Variantes del servicio');
    } else {
      const hasInvalidVariant = values.serviceVariants.some(v => 
        !v.name || !v.price || Number(v.price) <= 0
      );
      if (hasInvalidVariant) {
        incompleteFields.push('Nombre/precio de variantes');
      }
    }
    if (!values.residenciaIds || values.residenciaIds.length === 0) {
      incompleteFields.push('Residencias');
    }
    
    return incompleteFields;
  };

  if (!isOpen) return null;

  const CurrentStepComponent = steps[currentStep].component;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const incompleteFields = isLastStep ? getIncompleteRequiredFields() : [];

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
              <ServiceFormSyncWrapper listingId={initialData?.id} />
              <CurrentStepComponent />
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 rounded-b-lg">
              {/* Indicador de campos incompletos - solo en último paso */}
              {isLastStep && incompleteFields.length > 0 && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-destructive text-sm font-medium">
                    ⚠️ Campos obligatorios pendientes:
                  </p>
                  <p className="text-destructive/80 text-sm mt-1">
                    {incompleteFields.join(', ')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 w-full items-stretch">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={isFirstStep || isSubmitting}
                  className="h-12 w-full min-w-0 justify-center text-xs sm:text-base px-2 sm:px-4"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="truncate">Anterior</span>
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="h-12 w-full min-w-0 justify-center text-sm sm:text-base px-2 sm:px-4"
                >
                  <span className="truncate">Cancelar</span>
                </Button>
                
                {isLastStep ? (
                  <Button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => {
                      console.log('=== Submit button clicked ===');
                      console.log('Form values before submit:', form.getValues());
                      console.log('Form errors before submit:', form.formState.errors);
                      
                      // Trigger validation first
                      form.trigger().then((isValid) => {
                        console.log('Form validation result:', isValid);
                        
                        if (!isValid) {
                          const errors = form.formState.errors;
                          console.error('Form has validation errors:', errors);
                          
                          // Build specific error message
                          const errorFields = Object.keys(errors);
                          const errorMessage = errorFields.length > 0 
                            ? `Campos con errores: ${errorFields.join(', ')}`
                            : 'Por favor revisa los campos marcados en rojo';
                          
                          toast({
                            variant: "destructive",
                            title: "Error de validación", 
                            description: errorMessage
                          });
                          return;
                        }
                        
                        // If valid, submit the form
                        form.handleSubmit(handleFormSubmit, (validationErrors) => {
                          console.error('Submit validation errors:', validationErrors);
                          toast({
                            variant: "destructive",
                            title: "Error de validación",
                            description: "Por favor completa todos los campos requeridos"
                          });
                        })();
                      });
                    }}
                    className="h-12 w-full min-w-0 justify-center text-sm sm:text-base px-2 sm:px-4"
                  >
                    <span className="truncate">{isSubmitting ? 'Guardando...' : (initialData ? 'Actualizar' : 'Crear')}</span>
                  </Button>
                ) : (
                  <Button 
                    type="button"
                    onClick={nextStep}
                    className="h-12 w-full min-w-0 justify-center text-xs sm:text-base px-2 sm:px-4"
                  >
                    <span className="truncate">Siguiente</span>
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
