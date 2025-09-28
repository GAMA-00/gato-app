
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
  FormControl
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ServiceVariantEditor from './ServiceVariantEditor';
import PostPaymentToggle from './PostPaymentToggle';
import { v4 as uuidv4 } from 'uuid';
import { Clock, Info } from 'lucide-react';

const ServiceDetailsStep: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedResidencias = watch('residenciaIds') || [];
  const isPostPayment = watch('isPostPayment') || false;
  const serviceVariants = watch('serviceVariants') || [
    { id: uuidv4(), name: 'Servicio básico', price: '', duration: 60 }
  ];

  // Fetch residencias from Supabase
  const { data: residencias = [], isLoading: residenciasLoading } = useQuery({
    queryKey: ['residencias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('residencias')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleSelectAllResidencias = (checked: boolean) => {
    if (checked) {
      setValue('residenciaIds', residencias.map(r => r.id));
    } else {
      setValue('residenciaIds', []);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">
          3. Detalles del Servicio
        </h2>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Define las variantes de tu servicio, precios y áreas de cobertura.
        </p>
      </div>
      
      <PostPaymentToggle />
      
      {/* Slot Size Configuration */}
      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Configuración de Horarios
          </CardTitle>
          <CardDescription className="text-sm text-stone-600">
            Define el tamaño de los slots de tiempo que se mostrarán a los clientes para reservar tu servicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            control={control}
            name="slotSize"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-base font-medium">Tamaño de Slot</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(Number(value))}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="30" id="slot-30" />
                      <div className="space-y-1">
                        <FormLabel htmlFor="slot-30" className="font-medium cursor-pointer">
                          30 minutos
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Slots más pequeños, mayor flexibilidad de horarios
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <RadioGroupItem value="60" id="slot-60" />
                      <div className="space-y-1">
                        <FormLabel htmlFor="slot-60" className="font-medium cursor-pointer">
                          60 minutos (recomendado)
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Slots estándar, más fácil de gestionar
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </FormControl>
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800">
                    <p className="font-medium mb-1">¿Cómo funciona?</p>
                    <p>
                      El tamaño de slot define la grilla de horarios que verán los clientes. 
                      Si un servicio dura 90 minutos y eliges slots de 60 minutos, se reservarán 
                      2 slots consecutivos (120 minutos total).
                    </p>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
      
      <ServiceVariantEditor
        serviceVariants={serviceVariants}
        onVariantsChange={(variants) => setValue('serviceVariants', variants)}
        isPostPayment={isPostPayment}
      />

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-6 sm:pb-8 px-6 sm:px-8 pt-6 sm:pt-8">
          <CardTitle className="text-lg sm:text-xl">Cobertura de Servicio</CardTitle>
          <CardDescription className="text-sm sm:text-base text-stone-600 mt-2">
            Selecciona las residencias donde ofreces tu servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 sm:px-8 pb-8">
          <FormField
            control={control}
            name="residenciaIds"
            render={() => (
              <FormItem>
                <FormLabel className="text-base font-medium">Residencias Disponibles</FormLabel>
                
                {/* Select All Option */}
                <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <Checkbox
                    id="selectAll"
                    checked={selectedResidencias.length === residencias.length && residencias.length > 0}
                    onCheckedChange={handleSelectAllResidencias}
                  />
                  <FormLabel
                    htmlFor="selectAll"
                    className="text-base font-medium cursor-pointer text-blue-800"
                  >
                    Seleccionar todas las residencias
                  </FormLabel>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  {residenciasLoading ? (
                    <p className="text-muted-foreground">Cargando residencias...</p>
                  ) : (
                    residencias?.map((residencia) => (
                      <FormField
                        key={residencia.id}
                        control={control}
                        name="residenciaIds"
                        render={({ field }) => {
                          // Ensure field.value is always an array
                          const fieldValue = Array.isArray(field.value) ? field.value : [];
                          
                          return (
                            <FormItem
                              key={residencia.id}
                              className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={fieldValue.includes(residencia.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedValue = checked
                                      ? [...fieldValue, residencia.id]
                                      : fieldValue.filter((id: string) => id !== residencia.id);
                                    field.onChange(updatedValue);
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-base font-medium cursor-pointer">
                                  {residencia.name}
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  {residencia.address}
                                </p>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))
                  )}
                </div>
                <FormDescription className="mt-4">
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceDetailsStep;
