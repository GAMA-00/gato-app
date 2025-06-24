
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ServiceVariantEditor from './ServiceVariantEditor';
import { v4 as uuidv4 } from 'uuid';

const ServiceDetailsStep: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedResidencias = watch('residenciaIds') || [];
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
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-luxury-navy">
          Detalles del Servicio
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          Define las variantes de tu servicio y selecciona las residencias donde lo ofrecerás.
        </p>
      </div>
      
      <ServiceVariantEditor
        serviceVariants={serviceVariants}
        onVariantsChange={(variants) => setValue('serviceVariants', variants)}
      />

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg">Cobertura de Servicio</CardTitle>
          <CardDescription>
            Selecciona las residencias donde ofreces tu servicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  Selecciona todas las residencias donde puedes ofrecer tu servicio.
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
