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
import { Plus, Trash2, MoveVertical, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ServiceCustomVariablesEditor from './ServiceCustomVariablesEditor';

import { ServiceVariant } from '@/lib/types';

interface ServiceVariantEditorProps {
  serviceVariants: ServiceVariant[];
  onVariantsChange: (variants: ServiceVariant[]) => void;
  isPostPayment?: boolean | "ambas";
}

const ServiceVariantEditor: React.FC<ServiceVariantEditorProps> = ({
  serviceVariants,
  onVariantsChange,
  isPostPayment = false
}) => {
  const { control } = useFormContext();
  const [expandedVariants, setExpandedVariants] = React.useState<Set<string>>(new Set());
  const showPriceFields = isPostPayment === false || isPostPayment === "ambas";

  const handleAddServiceVariant = () => {
    const newVariant: ServiceVariant = {
      id: uuidv4(),
      name: '',
      price: isPostPayment === true ? 0 : '',
      duration: 60,
      customVariables: []
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

  const handleCustomVariablesChange = (index: number, customVariables: any[]) => {
    const updatedVariants = [...serviceVariants];
    updatedVariants[index] = { ...updatedVariants[index], customVariables };
    onVariantsChange(updatedVariants);
  };

  const toggleVariantExpansion = (variantId: string) => {
    const newExpanded = new Set(expandedVariants);
    if (newExpanded.has(variantId)) {
      newExpanded.delete(variantId);
    } else {
      newExpanded.add(variantId);
    }
    setExpandedVariants(newExpanded);
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
          className="px-5 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm">Agregar servicio</span>
        </Button>
      </div>
      
      {showPriceFields && (
        <p className="text-sm text-muted-foreground mb-4">
          Define las variantes o tipos de servicios que ofreces con sus respectivos precios y duraciones
        </p>
      )}
      
      <div className="space-y-4">
        {serviceVariants.map((variant, index) => (
          <Card key={variant.id || index} className="border">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12">
                  <FormField
                    control={control}
                    name={`serviceVariants.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Nombre del servicio</FormLabel>
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
                
                {isPostPayment === true && (
                  <div className="col-span-5">
                    <FormField
                      control={control}
                      name={`serviceVariants.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            Tarifa Base
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="Precio base" 
                                value={variant.price}
                                onChange={(e) => handleServiceVariantChange(index, 'price', e.target.value)}
                                className="pl-7"
                                required
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                {showPriceFields && (
                  <div className="col-span-4">
                    <FormField
                      control={control}
                      name={`serviceVariants.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Precio</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="Precio" 
                                value={variant.price}
                                onChange={(e) => handleServiceVariantChange(index, 'price', e.target.value)}
                                className="pl-7"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <div className={isPostPayment === true ? "col-span-5" : (showPriceFields ? "col-span-6" : "col-span-8")}>
                  <FormField
                    control={control}
                    name={`serviceVariants.${index}.duration`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">
                          Duración {isPostPayment === true ? "(estimada)" : ""} (min)
                        </FormLabel>
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

              {isPostPayment === "ambas" && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  <strong>Modalidades disponibles:</strong> Pre-pago y Post-pago
                </div>
              )}

              {/* Additional Person Pricing Section */}
              <Collapsible 
                open={expandedVariants.has(variant.id || String(index))}
                onOpenChange={() => toggleVariantExpansion(variant.id || String(index))}
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full justify-between mt-3 h-8 px-2"
                  >
                    <span className="text-sm font-medium">Agregar precio por persona</span>
                    {expandedVariants.has(variant.id || String(index)) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={control}
                        name={`serviceVariants.${index}.additionalPersonPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Precio por persona adicional</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  placeholder="0" 
                                  value={variant.additionalPersonPrice || ''}
                                  onChange={(e) => handleServiceVariantChange(index, 'additionalPersonPrice', e.target.value)}
                                  className="pl-7"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={control}
                        name={`serviceVariants.${index}.maxPersons`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Máximo de personas (opcional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="Sin límite" 
                                value={variant.maxPersons || ''}
                                onChange={(e) => handleServiceVariantChange(index, 'maxPersons', e.target.value)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Define el costo adicional por cada persona extra y opcionalmente establece un límite máximo de personas para este servicio.
                    </p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceVariantEditor;