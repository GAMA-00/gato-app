
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
import { 
  Image,
  Upload,
  Award,
  CheckCircle,
  AlertTriangle,
  Info as InfoIcon,
  Plus,
  Trash2,
  MoveVertical
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '../ui/card';
import { useIsMobile } from '@/hooks/use-mobile';

const ServiceFormFields: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedResidencias = watch('residenciaIds') || [];
  const selectedSubcategoryId = watch('subcategoryId');
  const aboutMe = watch('aboutMe') || '';
  const serviceVariants = watch('serviceVariants') || [
    { id: uuidv4(), name: 'Servicio básico', price: '', duration: 60 }
  ];
  const isMobile = useIsMobile();

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

  const handleSelectAllResidencias = (checked: boolean) => {
    if (checked) {
      setValue('residenciaIds', residencias.map(r => r.id));
    } else {
      setValue('residenciaIds', []);
    }
  };

  const handleAddServiceVariant = () => {
    const newVariant = {
      id: uuidv4(),
      name: '',
      price: '',
      duration: 60
    };
    setValue('serviceVariants', [...serviceVariants, newVariant]);
  };

  const handleRemoveServiceVariant = (index: number) => {
    if (serviceVariants.length <= 1) {
      return; // Mantener al menos una variante
    }
    const updatedVariants = [...serviceVariants];
    updatedVariants.splice(index, 1);
    setValue('serviceVariants', updatedVariants);
  };

  const handleServiceVariantChange = (index: number, field: string, value: string | number) => {
    const updatedVariants = [...serviceVariants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setValue('serviceVariants', updatedVariants);
  };

  const handleMoveVariant = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === serviceVariants.length - 1)
    ) {
      return;
    }

    const updatedVariants = [...serviceVariants];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Intercambiar posiciones
    [updatedVariants[index], updatedVariants[newIndex]] = 
    [updatedVariants[newIndex], updatedVariants[index]];
    
    setValue('serviceVariants', updatedVariants);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className={`${isMobile ? 'flex flex-col gap-1 h-auto p-1' : 'grid grid-cols-3'} w-full mb-4`}>
          <TabsTrigger className={isMobile ? 'w-full' : ''} value="basic">Información básica</TabsTrigger>
          <TabsTrigger className={isMobile ? 'w-full' : ''} value="profile">Perfil profesional</TabsTrigger>
          <TabsTrigger className={isMobile ? 'w-full' : ''} value="service">Detalles del servicio</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="profile" className="space-y-6">
          <div className="p-4 bg-muted/40 rounded-lg border">
            <h3 className="font-medium mb-2">Tu perfil profesional</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Esta información se mostrará en tu perfil de proveedor y será visible para los clientes.
            </p>
          
            <FormField
              control={control}
              name="profileImage"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Foto de perfil</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      {field.value ? (
                        <AvatarImage src={URL.createObjectURL(field.value)} alt="Profile preview" />
                      ) : (
                        <AvatarFallback className="text-lg">
                          {field.value?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <FormControl>
                      <div>
                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Subir imagen</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) field.onChange(file);
                            }}
                          />
                        </label>
                      </div>
                    </FormControl>
                  </div>
                  <FormDescription>
                    Sube una foto profesional para tu perfil (formato cuadrado recomendado)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="aboutMe"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Sobre mí</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cuéntale a tus clientes sobre tu experiencia, formación y filosofía de trabajo..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Esta información se mostrará en la sección "Sobre mí" de tu perfil ({aboutMe.length}/500 caracteres)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-medium mb-2">Información profesional adicional</h4>
              <FormField
                control={control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Años de experiencia</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={control}
                name="hasCertifications"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="hasCertifications"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="hasCertifications"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Tengo certificaciones profesionales
                    </label>
                  </div>
                )}
              />
              
              <FormField
                control={control}
                name="handlesDangerousDogs"
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="handlesDangerousDogs"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="handlesDangerousDogs"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Atiendo a mascotas potencialmente peligrosas
                    </label>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Sección de imágenes de trabajos anteriores */}
          <FormField
            control={control}
            name="galleryImages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Imágenes para tu galería</FormLabel>
                <FormControl>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                      <Image className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Agregar imágenes</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          field.onChange([...(field.value || []), ...files]);
                        }}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {field.value?.map((file: File, i: number) => (
                        <div key={i} className="relative">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Gallery image ${i}`}
                            className="h-16 w-16 object-cover rounded" 
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            onClick={() => {
                              const newFiles = [...field.value];
                              newFiles.splice(i, 1);
                              field.onChange(newFiles);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormDescription>
                  Sube fotos de trabajos realizados para mostrar en tu galería
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
        
        <TabsContent value="service" className="space-y-6">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-2">
              <InfoIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium">Información importante sobre precios</p>
                <p className="text-muted-foreground text-sm">
                  La tarifa que estableces será exactamente el ingreso que recibes por hora de servicio. 
                  Como plataforma, cobramos un 20% adicional al cliente que aparecerá en el listado de anuncios.
                </p>
                <p className="text-xs text-muted-foreground">
                  Ejemplo: Si estableces $100/hora como tu tarifa, el cliente verá $120/hora en el listado.
                </p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Catálogo de servicios</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleAddServiceVariant}
              >
                <Plus className="h-4 w-4 mr-1" /> Agregar servicio
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Define las variantes o tipos de servicios que ofreces con sus respectivos precios y duraciones
            </p>
            
            <div className="space-y-4">
              {serviceVariants.map((variant, index) => (
                <Card key={variant.id || index} className="border">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12 mb-2">
                        <FormField
                          control={control}
                          name={`serviceVariants.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nombre del servicio</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Ej. Corte básico" 
                                  value={variant.name}
                                  onChange={(e) => handleServiceVariantChange(index, 'name', e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="col-span-5">
                        <FormField
                          control={control}
                          name={`serviceVariants.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Precio ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder="Precio" 
                                  value={variant.price}
                                  onChange={(e) => handleServiceVariantChange(index, 'price', e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="col-span-5">
                        <FormField
                          control={control}
                          name={`serviceVariants.${index}.duration`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Duración (min)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="15" 
                                  step="5" 
                                  placeholder="Minutos" 
                                  value={variant.duration}
                                  onChange={(e) => handleServiceVariantChange(index, 'duration', e.target.value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="col-span-2 flex items-end justify-end space-x-1">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleMoveVariant(index, 'up')}
                          disabled={index === 0}
                          className="h-8 w-8"
                        >
                          <MoveVertical className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive/90"
                          onClick={() => handleRemoveServiceVariant(index)}
                          disabled={serviceVariants.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              Para tu seguridad, tu anuncio solo será visible en las residencias que selecciones a continuación.
            </AlertDescription>
          </Alert>

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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServiceFormFields;
