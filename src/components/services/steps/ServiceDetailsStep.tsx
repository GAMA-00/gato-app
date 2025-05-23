
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
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
  const { data: residencias = [] } = useQuery({
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
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Paso 3: Detalles del servicio</h2>
      
      <ServiceVariantEditor
        serviceVariants={serviceVariants}
        onVariantsChange={(variants) => setValue('serviceVariants', variants)}
      />

      <FormField
        control={control}
        name="residenciaIds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Residencias Disponibles</FormLabel>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedResidencias.length === residencias.length && residencias.length > 0}
                  onCheckedChange={handleSelectAllResidencias}
                />
                <label
                  htmlFor="selectAll"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Seleccionar todas las residencias
                </label>
              </div>
              <div className="grid gap-2">
                {residencias.map((residencia) => (
                  <div key={residencia.id} className="flex items-center space-x-2">
                    <FormField
                      control={control}
                      name="residenciaIds"
                      render={({ field }) => {
                        // Ensure field.value is always an array
                        const fieldValue = Array.isArray(field.value) ? field.value : [];
                        
                        return (
                          <Checkbox
                            id={`residencia-${residencia.id}`}
                            checked={fieldValue.includes(residencia.id)}
                            onCheckedChange={(checked) => {
                              const updatedValue = checked
                                ? [...fieldValue, residencia.id]
                                : fieldValue.filter((id: string) => id !== residencia.id);
                              field.onChange(updatedValue);
                            }}
                          />
                        );
                      }}
                    />
                    <label
                      htmlFor={`residencia-${residencia.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {residencia.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <FormDescription>
              Selecciona las residencias donde este servicio estará disponible.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ServiceDetailsStep;
