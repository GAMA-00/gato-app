
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { Image } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ServiceFormFields: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedResidencias = watch('residenciaIds') || [];

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

  // Fetch service categories and types
  const { data: categoriesData } = useQuery({
    queryKey: ['service-categories-and-types'],
    queryFn: async () => {
      const { data: categories, error: catError } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      
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

  const handleSelectAllResidencias = (checked: boolean) => {
    if (checked) {
      setValue('residenciaIds', residencias.map(r => r.id));
    } else {
      setValue('residenciaIds', []);
    }
  };

  return (
    <div className="space-y-6">
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
        name="subcategoryId" // This will map to service_type_id in the database
        render={({ field }) => (
          <FormItem>
            <FormLabel>¿Qué servicio quieres anunciar?</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
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

      <div className="grid sm:grid-cols-2 gap-6">
        <FormField
          control={control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duración (mins)</FormLabel>
              <FormControl>
                <Input type="number" min="15" step="15" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Costo ($)</FormLabel>
              <FormControl>
                <Input type="number" min="1" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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

      <FormField
        control={control}
        name="residenciaIds"
        render={() => (
          <FormItem>
            <FormLabel>Residencias Disponibles</FormLabel>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedResidencias.length === residencias.length}
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
                      render={({ field }) => (
                        <Checkbox
                          id={`residencia-${residencia.id}`}
                          checked={field.value?.includes(residencia.id)}
                          onCheckedChange={(checked) => {
                            const updatedValue = checked
                              ? [...(field.value || []), residencia.id]
                              : field.value?.filter((id: string) => id !== residencia.id) || [];
                            field.onChange(updatedValue);
                          }}
                        />
                      )}
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

      {/* Sección de imágenes de trabajos anteriores */}
      <FormField
        control={control}
        name="workImages"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Imágenes de trabajos anteriores</FormLabel>
            <FormControl>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Agregar imágenes</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      field.onChange(files);
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {field.value?.map((file: File, i: number) => (
                    <div key={i} className="relative">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt="" 
                        className="h-16 w-16 object-cover rounded" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </FormControl>
            <FormDescription>
              Adjunta fotos de trabajos realizados anteriormente.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ServiceFormFields;
