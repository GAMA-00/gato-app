
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, MoveVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ServiceVariant {
  id?: string;
  name: string;
  price: string | number;
  duration: string | number;
}

interface ServiceVariantEditorProps {
  serviceVariants: ServiceVariant[];
  onVariantsChange: (variants: ServiceVariant[]) => void;
}

const ServiceVariantEditor: React.FC<ServiceVariantEditorProps> = ({
  serviceVariants,
  onVariantsChange
}) => {
  const { control } = useFormContext();

  const handleAddServiceVariant = () => {
    const newVariant = {
      id: uuidv4(),
      name: '',
      price: '',
      duration: 60
    };
    onVariantsChange([...serviceVariants, newVariant]);
  };

  const handleRemoveServiceVariant = (index: number) => {
    if (serviceVariants.length <= 1) {
      return; // Mantener al menos una variante
    }
    const updatedVariants = [...serviceVariants];
    updatedVariants.splice(index, 1);
    onVariantsChange(updatedVariants);
  };

  const handleServiceVariantChange = (index: number, field: string, value: string | number) => {
    const updatedVariants = [...serviceVariants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    onVariantsChange(updatedVariants);
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
    
    onVariantsChange(updatedVariants);
  };

  return (
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
  );
};

export default ServiceVariantEditor;
