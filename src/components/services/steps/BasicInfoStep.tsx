
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const BasicInfoStep: React.FC = () => {
  const { control } = useFormContext();

  // Fetch service categories and types
  const { data: categoriesData, isLoading: loadingCategories } = useQuery({
    queryKey: ['service-categories-and-types'],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('service_categories')
        .select('*')
        .order('label');
      
      if (catError) throw catError;
      
      const { data: serviceTypes, error: stError } = await supabase
        .from('service_types')
        .select('*')
        .order('name');
        
      if (stError) throw stError;
      
      // Group service types by category
      const serviceTypesByCategory = serviceTypes.reduce((acc, type) => {
        if (!acc[type.category_id]) {
          acc[type.category_id] = [];
        }
        acc[type.category_id].push(type);
        return acc;
      }, {} as Record<string, any[]>);
      
      return { 
        categories,
        serviceTypesByCategory
      };
    }
  });

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Paso 1: Información básica</h2>
      
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Título del anuncio</FormLabel>
            <FormControl>
              <Input placeholder="Ej. Limpieza profesional" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="subcategoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>¿Qué servicio quieres anunciar?</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              disabled={loadingCategories}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo de servicio..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-[300px]">
                {categoriesData?.categories?.map((category) => (
                  <SelectGroup key={category.id}>
                    <SelectLabel>{category.label}</SelectLabel>
                    {categoriesData.serviceTypesByCategory[category.id]?.map((serviceType) => (
                      <SelectItem key={serviceType.id} value={serviceType.id}>
                        {serviceType.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descripción</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe a detalle el servicio que ofreces..."
                rows={3}
                {...field}
              />
            </FormControl>
            <FormDescription>
              Explica los detalles más importantes de tu servicio.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default BasicInfoStep;
