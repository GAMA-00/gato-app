
import React from 'react';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Residencia } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface ProviderResidencesFieldProps {
  residencias: Residencia[];
  isSubmitting: boolean;
  loadingResidencias: boolean;
  form: any;
}

const ProviderResidencesField: React.FC<ProviderResidencesFieldProps> = ({ 
  residencias, 
  isSubmitting, 
  loadingResidencias,
  form 
}) => {
  return (
    <FormField
      control={form.control}
      name="providerResidenciaIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base font-medium">Residencias donde ofreces tus servicios</FormLabel>
          {loadingResidencias ? (
            <div className="flex items-center justify-center p-4 border rounded-md">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-base">Cargando residencias...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4 border rounded-md">
              {residencias.length === 0 ? (
                <p className="text-sm text-gray-500">No hay residencias disponibles</p>
              ) : (
                residencias.map((residencia) => (
                  <div key={residencia.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`residencia-checkbox-${residencia.id}`}
                      checked={field.value?.includes(residencia.id)}
                      onCheckedChange={(checked) => {
                        const checkedArr = Array.isArray(field.value) ? field.value : [];
                        if (checked) {
                          field.onChange([...checkedArr, residencia.id]);
                        } else {
                          field.onChange(checkedArr.filter((id: string) => id !== residencia.id));
                        }
                      }}
                      disabled={isSubmitting}
                      className="h-5 w-5"
                    />
                    <label htmlFor={`residencia-checkbox-${residencia.id}`} className="text-base font-medium cursor-pointer">
                      {residencia.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ProviderResidencesField;
