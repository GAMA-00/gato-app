
import React, { useState } from 'react';
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
import { SERVICE_CATEGORIES } from '@/lib/data';
import { SERVICE_SUBCATEGORIES } from '@/lib/subcategories';
import { Image } from 'lucide-react';

const MOCK_BUILDINGS = [
  { id: '1', name: 'Colinas de Montealegre', address: 'Tres Rios' },
  { id: '2', name: 'Gregal', address: 'Tres Rios' },
  { id: '3', name: 'El Herran', address: 'Tres Rios' }
];

// Construye un arreglo de todas las subcategorías con su categoría asociada
const ALL_SUBCATEGORIES = Object.entries(SERVICE_SUBCATEGORIES)
  .flatMap(([category, subcats]) => subcats.map(subcat => ({
    category,
    subcat
  })));

const ServiceFormFields: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedBuildings = watch('buildingIds') || [];

  // Para imágenes de trabajos anteriores
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Mantén el estado local para la categoría y subcategoría seleccionadas
  const selectedSubcat = watch('name');
  const selectedCategory = ALL_SUBCATEGORIES.find(sc => sc.subcat === selectedSubcat)?.category || '';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
    setValue("workImages", files, { shouldValidate: true });
  };

  const handleSelectAllBuildings = (checked: boolean) => {
    if (checked) {
      setValue('buildingIds', MOCK_BUILDINGS.map(b => b.id));
    } else {
      setValue('buildingIds', []);
    }
  };

  // Cuando cambia la subcategoría seleccionada, actualiza también la categoría en el formulario
  React.useEffect(() => {
    if (selectedSubcat && selectedCategory) {
      setValue('category', selectedCategory, { shouldValidate: true });
    }
  }, [selectedSubcat, selectedCategory, setValue]);

  return (
    <div className="space-y-6">
      {/* CAMBIO: Dropdown de subcategoría en vez de Name */}
      <FormField
        control={control}
        name="name"
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
              <SelectContent className="z-[999] bg-background">
                {Object.entries(SERVICE_SUBCATEGORIES).map(([category, subcats]) => (
                  <SelectGroup key={category}>
                    <SelectLabel className="text-muted-foreground font-semibold">{SERVICE_CATEGORIES[category]?.label || category}</SelectLabel>
                    {subcats.map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>
                        {subcat}
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Input value={SERVICE_CATEGORIES[selectedCategory]?.label || selectedCategory} readOnly className="bg-muted" />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
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
        name="buildingIds"
        render={() => (
          <FormItem>
            <FormLabel>Residencias Disponibles</FormLabel>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectedBuildings.length === MOCK_BUILDINGS.length}
                  onCheckedChange={handleSelectAllBuildings}
                />
                <label
                  htmlFor="selectAll"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Seleccionar todas las residencias
                </label>
              </div>
              <div className="grid gap-2">
                {MOCK_BUILDINGS.map((building) => (
                  <div key={building.id} className="flex items-center space-x-2">
                    <FormField
                      control={control}
                      name="buildingIds"
                      render={({ field }) => (
                        <Checkbox
                          id={`building-${building.id}`}
                          checked={field.value?.includes(building.id)}
                          onCheckedChange={(checked) => {
                            const updatedValue = checked
                              ? [...(field.value || []), building.id]
                              : field.value?.filter((id: string) => id !== building.id) || [];
                            field.onChange(updatedValue);
                          }}
                        />
                      )}
                    />
                    <label
                      htmlFor={`building-${building.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {building.name}
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

      {/* Subida de imágenes de trabajos anteriores */}
      <FormField
        control={control}
        name="workImages"
        render={() => (
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
                    onChange={handleImageChange}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {previews.map((src, i) => (
                    <img key={i} src={src} alt="" className="h-16 w-16 object-cover rounded" />
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
