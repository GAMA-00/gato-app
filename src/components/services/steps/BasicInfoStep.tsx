
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCategories } from '@/hooks/useCategories';

const BasicInfoStep = () => {
  const { control } = useFormContext();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">
          1. Información Básica
        </h2>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Proporciona los datos esenciales de tu servicio para que los clientes puedan encontrarte.
        </p>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-6 sm:pb-8 px-6 sm:px-8 pt-6 sm:pt-8">
          <CardTitle className="text-lg sm:text-xl">Detalles del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 sm:space-y-10 px-6 sm:px-8 pb-8">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                  Nombre del Servicio
                </FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Paws Pet Grooming" 
                    {...field} 
                    className="text-base sm:text-lg py-4 h-auto border-stone-300 focus:border-primary"
                  />
                </FormControl>
                <FormDescription className="text-sm sm:text-base text-stone-600 mt-2">
                  Elige un nombre descriptivo y atractivo para tu servicio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="subcategoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                  Categoría del Servicio
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-base sm:text-lg py-4 h-auto border-stone-300 focus:border-primary">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>Cargando categorías...</SelectItem>
                    ) : (
                      categoriesData?.categories?.flatMap(category => 
                        categoriesData.serviceTypesByCategory[category.id]?.map(serviceType => (
                          <SelectItem key={serviceType.id} value={serviceType.id}>
                            {category.label} - {serviceType.name}
                          </SelectItem>
                        )) || []
                      )
                    )}
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
                <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                  Descripción
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe en pocas palabras tu servicio o empresa." 
                    className="resize-none text-base sm:text-lg min-h-[120px] sm:min-h-[140px] border-stone-300 focus:border-primary" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription className="text-sm sm:text-base text-stone-600 mt-2">
                  Una descripción detallada ayuda a los clientes a entender mejor tu servicio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="slotPreferences.serviceRequirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                  Requerimientos para el servicio (opcional)
                </FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Ej: Área techada, acceso a luz, electricidad, agua corriente..." 
                    className="resize-none text-base sm:text-lg min-h-[100px] sm:min-h-[120px] border-stone-300 focus:border-primary" 
                    {...field} 
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription className="text-sm sm:text-base text-stone-600 mt-2">
                  Especifica las condiciones necesarias para realizar el servicio.
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

export default BasicInfoStep;
