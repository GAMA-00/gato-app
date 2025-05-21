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
  File,
  Upload,
  Award,
  CheckCircle,
  AlertTriangle,
  Info as InfoIcon,
  Plus,
  Trash2,
  MoveVertical,
  Eye
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '../ui/alert';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent } from '../ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface ServiceFormFieldsProps {
  currentStep: number;
}

const ServiceFormFields: React.FC<ServiceFormFieldsProps> = ({ currentStep }) => {
  const { control, setValue, watch, getValues } = useFormContext();
  const selectedResidencias = watch('residenciaIds') || [];
  const selectedSubcategoryId = watch('subcategoryId');
  const aboutMe = watch('aboutMe') || '';
  const hasCertifications = watch('hasCertifications');
  const certificationFiles = watch('certificationFiles') || [];
  const serviceVariants = watch('serviceVariants') || [
    { id: uuidv4(), name: 'Servicio básico', price: '', duration: 60 }
  ];
  const isMobile = useIsMobile();
  
  // Fix for createObjectURL - safely create URL for files
  const safeCreateObjectURL = (file: unknown): string | null => {
    // Check if file is a Blob (which includes File objects)
    if (file && typeof Blob !== 'undefined' && file instanceof Blob) {
      return URL.createObjectURL(file);
    }
    
    // If it's a string, it might already be a URL
    if (typeof file === 'string') {
      return file;
    }
    
    // If it has a url property (for already uploaded files)
    if (file && typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
      return file.url;
    }
    
    return null;
  };

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

  const handleCertificationFile = async (file: File) => {
    if (!file) return;
    
    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use PDF o imágenes (JPG, PNG)');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 5MB');
      return;
    }
    
    // Create preview only for image types
    let preview = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }
    
    // Add file to form state
    const newFiles = [...certificationFiles, {
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: preview
    }];
    
    setValue('certificationFiles', newFiles);
  };
  
  const removeCertificationFile = (id: string) => {
    // First revoke any object URLs to prevent memory leaks
    const fileToRemove = certificationFiles.find(f => f.id === id);
    if (fileToRemove && fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    const newFiles = certificationFiles.filter(f => f.id !== id);
    setValue('certificationFiles', newFiles);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Safely clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      // Clean up any created object URLs to prevent memory leaks
      certificationFiles.forEach(fileObj => {
        if (fileObj.preview && typeof fileObj.preview === 'string' && fileObj.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileObj.preview);
        }
      });
    };
  }, []);

  // Renderizado condicional basado en el paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 0: // Información básica
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
        
      case 1: // Perfil profesional
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Paso 2: Perfil profesional</h2>
            
            <div className="bg-muted/40 rounded-lg border p-4">
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
                          <AvatarImage 
                            src={safeCreateObjectURL(field.value)}
                            alt="Profile preview" 
                          />
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
                <h4 className="text-sm font-medium mb-2">Información profesional</h4>
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
                    <FormItem className="space-y-4">
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
                      
                      {field.value && (
                        <div className="ml-6 space-y-3 border-l-2 pl-4 border-muted">
                          <FormLabel className="text-sm">Adjunta tus certificaciones</FormLabel>
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-3 mb-2">
                              {certificationFiles.map((certFile) => (
                                <div 
                                  key={certFile.id} 
                                  className="relative bg-muted/50 rounded-md p-2 pr-8 flex items-center gap-2 border"
                                >
                                  <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                  <div className="max-w-[150px] overflow-hidden">
                                    <div className="text-xs font-medium truncate">{certFile.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{formatFileSize(certFile.size)}</div>
                                  </div>
                                  <button 
                                    type="button" 
                                    className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeCertificationFile(certFile.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  {certFile.preview && (
                                    <button 
                                      type="button" 
                                      className="absolute bottom-1 right-1 text-muted-foreground hover:text-primary"
                                      onClick={() => {
                                        if (certFile.preview) {
                                          window.open(certFile.preview, '_blank')
                                        }
                                      }}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <label className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors inline-block">
                              <Upload className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Subir certificado</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleCertificationFile(file);
                                }}
                              />
                            </label>
                            <FormDescription className="text-xs">
                              Formatos aceptados: PDF, JPG, PNG (máx 5MB)
                            </FormDescription>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                
                
              </div>
            </div>

            <FormField
              control={control}
              name="galleryImages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imágenes para tu galería</FormLabel>
                  <FormControl>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                        <Upload className="h-4 w-4 text-muted-foreground" />
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
                        {field.value && Array.isArray(field.value) && field.value.map((file: any, i: number) => {
                          const fileUrl = safeCreateObjectURL(file);
                          return fileUrl ? (
                            <div key={i} className="relative">
                              <img 
                                src={fileUrl} 
                                alt={`Gallery image ${i}`}
                                className="h-16 w-16 object-cover rounded" 
                              />
                              <button
                                type="button"
                                className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                                onClick={() => {
                                  const newFiles = [...field.value];
                                  // Revoke the URL to prevent memory leaks
                                  if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('blob:')) {
                                    URL.revokeObjectURL(fileUrl);
                                  }
                                  newFiles.splice(i, 1);
                                  field.onChange(newFiles);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
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
          </div>
        );
        
      case 2: // Detalles del servicio
        return (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Paso 3: Detalles del servicio</h2>
            
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
      default:
        return null;
    }
  };

  return renderStep();
};

export default ServiceFormFields;
