
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';
import { Residencia } from '@/lib/types';
import CondominiumSelect from './CondominiumSelect';
import HouseNumberInput from './HouseNumberInput';

interface ClientResidenceFieldProps {
  residencias: Residencia[];
  isSubmitting: boolean;
  loadingResidencias: boolean;
  form: any;
}

const ClientResidenceField: React.FC<ClientResidenceFieldProps> = ({ 
  residencias, 
  isSubmitting, 
  loadingResidencias,
  form 
}) => {
  // Watch the residencia value to pass it to the condominium select
  const selectedResidenciaId = form.watch('residenciaId');
  
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="residenciaId"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-medium">Seleccione su Residencia</FormLabel>
            <FormControl>
              <div className="relative">
                <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Reset condominium when residence changes
                    form.setValue('condominiumId', '');
                  }} 
                  value={field.value || ''}
                  disabled={isSubmitting || loadingResidencias}
                >
                  <SelectTrigger className="pl-10 h-12 text-base">
                    <SelectValue placeholder={loadingResidencias ? "Cargando..." : "Elija una residencia"} />
                  </SelectTrigger>
                  <SelectContent>
                    {residencias.map((residencia) => (
                      <SelectItem key={residencia.id} value={residencia.id} className="text-base">
                        {residencia.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Only show condominium select if a residencia is selected */}
      {selectedResidenciaId && (
        <CondominiumSelect 
          residenciaId={selectedResidenciaId} 
          form={form}
          isSubmitting={isSubmitting}
        />
      )}
      
      {/* House number input */}
      <HouseNumberInput 
        form={form}
        isSubmitting={isSubmitting}
        disabled={!selectedResidenciaId}
      />
    </div>
  );
};

export default ClientResidenceField;
