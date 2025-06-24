
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/useCategories';
import { useResidencias } from '@/hooks/useResidencias';

const BasicInfoStep = () => {
  const { control } = useFormContext();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: residencias, isLoading: residenciasLoading } = useResidencias();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold text-luxury-navy">
          Información Básica
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed">
          Proporciona la información básica de tu servicio. Esta información será visible para los clientes al buscar servicios.
        </p>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader className="pb-6">
          <CardTitle className="text-lg">Detalles del Servicio</CardTitle>
          <CardDescription>
            Completa la información principal de tu servicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Nombre del Servicio</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ej: Limpieza de hogar completa" 
                    {...field} 
                    className="text-base py-3"
                  />
                </FormControl>
                <FormDescription>
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
                <FormLabel className="text-base font-medium">Categoría del Servicio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-base py-3">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>Cargando categorías...</SelectItem>
                    ) : (
                      categories?.flatMap(category => 
                        category.subcategories?.map(subcategory => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {category.name} - {subcategory.name}
                          </SelectItem>
                        )) || []
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Selecciona la categoría que mejor describe tu servicio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Descripción</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe detalladamente tu servicio, qué incluye, materiales que utilizas, etc." 
                    className="resize-none text-base min-h-[120px]" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Una descripción detallada ayuda a los clientes a entender mejor tu servicio.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

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
                          return (
                            <FormItem
                              key={residencia.id}
                              className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(residencia.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValue, residencia.id])
                                      : field.onChange(
                                          currentValue?.filter(
                                            (value) => value !== residencia.id
                                          )
                                        );
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

export default BasicInfoStep;
