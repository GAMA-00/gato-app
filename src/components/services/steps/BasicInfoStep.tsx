
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
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-2 sm:space-y-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-luxury-navy">
          1. Información Básica
        </h2>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-4 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Detalles del Servicio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 sm:space-y-6">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base font-medium">Nombre del Servicio</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Paws Pet Grooming" 
                    {...field} 
                    className="text-sm sm:text-base py-2.5 sm:py-3 h-auto"
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
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
                <FormLabel className="text-sm sm:text-base font-medium">Categoría del Servicio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm sm:text-base py-2.5 sm:py-3 h-auto">
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
                            {category.name} - {serviceType.name}
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
                <FormLabel className="text-sm sm:text-base font-medium">Descripción</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe en pocas palabras tu servicio o empresa." 
                    className="resize-none text-sm sm:text-base min-h-[100px] sm:min-h-[120px]" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  Una descripción detallada ayuda a los clientes a entender mejor tu servicio.
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
