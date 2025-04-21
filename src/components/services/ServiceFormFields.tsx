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
  SelectValue
} from '@/components/ui/select';
import { SERVICE_CATEGORIES } from '@/lib/data';

const MOCK_BUILDINGS = [
  { id: '1', name: 'Colinas de Montealegre', address: 'Tres Rios' },
  { id: '2', name: 'Gregal', address: 'Tres Rios' },
  { id: '3', name: 'El Herran', address: 'Tres Rios' }
];

const ServiceFormFields: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const selectedBuildings = watch('buildingIds') || [];

  const handleSelectAllBuildings = (checked: boolean) => {
    if (checked) {
      setValue('buildingIds', MOCK_BUILDINGS.map(b => b.id));
    } else {
      setValue('buildingIds', []);
    }
  };

  return (
    <div className="space-y-6">
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Service Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter service name" {...field} />
            </FormControl>
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
              <FormLabel>Category</FormLabel>
              <Select 
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(SERVICE_CATEGORIES).map(([value, category]) => (
                    <SelectItem key={value} value={value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <FormLabel>Duration (mins)</FormLabel>
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
                <FormLabel>Price ($)</FormLabel>
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
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter service description..." 
                rows={3}
                {...field} 
              />
            </FormControl>
            <FormDescription>
              Describe the service in detail.
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
              Seleccione las residencias donde este servicio estará disponible
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ServiceFormFields;
