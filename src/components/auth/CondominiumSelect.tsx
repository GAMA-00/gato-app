import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Home } from 'lucide-react';

interface CondominiumSelectProps {
  residenciaId: string | undefined;
  form: any;
  isSubmitting?: boolean;
}

export const CondominiumSelect: React.FC<CondominiumSelectProps> = ({ 
  residenciaId, 
  form, 
  isSubmitting = false
}) => {
  const { data: condominiums = [], isLoading } = useQuery({
    queryKey: ['condominiums', residenciaId],
    queryFn: async () => {
      if (!residenciaId) return [];
      
      const { data, error } = await supabase
        .from('condominiums')
        .select('id, name')
        .eq('residencia_id', residenciaId)
        .order('name');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!residenciaId
  });

  // List of predefined condominiums for "Colinas de Montealegre"
  const condominiumNames = [
    'El Carao', 'La Ceiba', 'Guayaquil', 'Ilang-Ilang', 'Nogal', 
    'Guayacán Real', 'Cedro Alto', 'Roble Sabana', 'Alamo', 'Guaitil'
  ];

  return (
    <FormField
      control={form.control}
      name="condominiumId"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base font-medium">Seleccione su Condominio</FormLabel>
          <FormControl>
            <div className="relative">
              <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value || ''}
                  disabled={isSubmitting || !residenciaId}
                >
                  <SelectTrigger className="pl-10 h-12 text-base">
                    <SelectValue placeholder={!residenciaId ? 
                      "Primero seleccione una residencia" : 
                      "Elija un condominio"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {condominiums.length > 0 ? (
                      // Show condominiums from database if available
                      condominiums.map((condominium: any) => (
                        <SelectItem key={condominium.id} value={condominium.id} className="text-base">
                          {condominium.name}
                        </SelectItem>
                      ))
                    ) : (
                      // Otherwise show predefined list for Colinas de Montealegre
                      condominiumNames.map((name, index) => (
                        <SelectItem key={`static-${index}`} value={`static-${index}`} className="text-base">
                          {name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CondominiumSelect;
