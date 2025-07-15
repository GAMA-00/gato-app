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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CustomVariableGroup, CustomVariable, CustomVariableOption } from '@/lib/types';

interface CustomVariablesEditorProps {
  customVariableGroups: CustomVariableGroup[];
  onGroupsChange: (groups: CustomVariableGroup[]) => void;
  useCustomVariables: boolean;
  onUseCustomVariablesChange: (use: boolean) => void;
}

const CustomVariablesEditor: React.FC<CustomVariablesEditorProps> = ({
  customVariableGroups,
  onGroupsChange,
  useCustomVariables,
  onUseCustomVariablesChange
}) => {
  const { control } = useFormContext();

  const handleAddGroup = () => {
    const newGroup: CustomVariableGroup = {
      id: uuidv4(),
      name: '',
      description: '',
      variables: []
    };
    onGroupsChange([...customVariableGroups, newGroup]);
  };

  const handleRemoveGroup = (groupIndex: number) => {
    const updatedGroups = [...customVariableGroups];
    updatedGroups.splice(groupIndex, 1);
    onGroupsChange(updatedGroups);
  };

  const handleAddVariable = (groupIndex: number) => {
    const updatedGroups = [...customVariableGroups];
    const newVariable: CustomVariable = {
      id: uuidv4(),
      name: '',
      type: 'single',
      isRequired: false,
      options: [
        {
          id: uuidv4(),
          name: '',
          price: 0
        }
      ]
    };
    updatedGroups[groupIndex].variables.push(newVariable);
    onGroupsChange(updatedGroups);
  };

  const handleRemoveVariable = (groupIndex: number, variableIndex: number) => {
    const updatedGroups = [...customVariableGroups];
    updatedGroups[groupIndex].variables.splice(variableIndex, 1);
    onGroupsChange(updatedGroups);
  };

  const handleAddOption = (groupIndex: number, variableIndex: number) => {
    const updatedGroups = [...customVariableGroups];
    const newOption: CustomVariableOption = {
      id: uuidv4(),
      name: '',
      price: 0
    };
    updatedGroups[groupIndex].variables[variableIndex].options.push(newOption);
    onGroupsChange(updatedGroups);
  };

  const handleRemoveOption = (groupIndex: number, variableIndex: number, optionIndex: number) => {
    const updatedGroups = [...customVariableGroups];
    const variable = updatedGroups[groupIndex].variables[variableIndex];
    if (variable.options.length > 1) {
      variable.options.splice(optionIndex, 1);
      onGroupsChange(updatedGroups);
    }
  };

  const handleGroupChange = (groupIndex: number, field: keyof CustomVariableGroup, value: any) => {
    const updatedGroups = [...customVariableGroups];
    updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], [field]: value };
    onGroupsChange(updatedGroups);
  };

  const handleVariableChange = (groupIndex: number, variableIndex: number, field: keyof CustomVariable, value: any) => {
    const updatedGroups = [...customVariableGroups];
    updatedGroups[groupIndex].variables[variableIndex] = { 
      ...updatedGroups[groupIndex].variables[variableIndex], 
      [field]: value 
    };
    onGroupsChange(updatedGroups);
  };

  const handleOptionChange = (groupIndex: number, variableIndex: number, optionIndex: number, field: keyof CustomVariableOption, value: any) => {
    const updatedGroups = [...customVariableGroups];
    updatedGroups[groupIndex].variables[variableIndex].options[optionIndex] = {
      ...updatedGroups[groupIndex].variables[variableIndex].options[optionIndex],
      [field]: value
    };
    onGroupsChange(updatedGroups);
  };

  if (!useCustomVariables) {
    return (
      <div className="border rounded-lg p-6 text-center">
        <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium mb-2">Variables adicionales</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Crea variables personalizadas para que tus clientes puedan seleccionar opciones específicas como tipo de comida, número de personas, etc.
        </p>
        <Button onClick={() => onUseCustomVariablesChange(true)} variant="outline">
          Activar Variables adicionales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Variables adicionales</h3>
          <p className="text-sm text-muted-foreground">
            Define variables que los clientes podrán seleccionar al reservar
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={useCustomVariables}
            onCheckedChange={onUseCustomVariablesChange}
          />
          <span className="text-sm">Activado</span>
        </div>
      </div>

      <div className="space-y-4">
        {customVariableGroups.map((group, groupIndex) => (
          <Card key={group.id} className="border">
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Variable {groupIndex + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGroup(groupIndex)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {group.variables.map((variable, variableIndex) => (
                  <Card key={variable.id} className="border border-gray-200">
                    <CardContent className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="grid grid-cols-3 gap-3 flex-1">
                            <div>
                              <FormLabel className="text-xs">Nombre de la variable</FormLabel>
                              <Input
                                placeholder="Ej. Tipo de cocina"
                                value={variable.name}
                                onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">Tipo</FormLabel>
                              <Select
                                value={variable.type}
                                onValueChange={(value) => handleVariableChange(groupIndex, variableIndex, 'type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="single">Selección única</SelectItem>
                                  <SelectItem value="multiple">Selección múltiple</SelectItem>
                                  <SelectItem value="quantity">Cantidad</SelectItem>
                                  <SelectItem value="price">Precio</SelectItem>
                                  <SelectItem value="min_max">Mínimo/Máximo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={variable.isRequired}
                                onCheckedChange={(checked) => handleVariableChange(groupIndex, variableIndex, 'isRequired', checked)}
                              />
                              <span className="text-xs">Requerido</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveVariable(groupIndex, variableIndex)}
                            className="text-destructive hover:text-destructive/90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {variable.type === 'quantity' && (
                          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded">
                            <div>
                              <FormLabel className="text-xs">Precio por unidad</FormLabel>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={variable.pricePerUnit || ''}
                                  onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                                  className="pl-7"
                                />
                              </div>
                            </div>
                            <div>
                              <FormLabel className="text-xs">Cantidad mínima</FormLabel>
                              <Input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={variable.minQuantity || ''}
                                onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'minQuantity', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">Cantidad máxima</FormLabel>
                              <Input
                                type="number"
                                min="1"
                                placeholder="10"
                                value={variable.maxQuantity || ''}
                                onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'maxQuantity', parseInt(e.target.value) || 10)}
                              />
                            </div>
                          </div>
                        )}

                        {variable.type === 'price' && (
                          <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded">
                            <div>
                              <FormLabel className="text-xs">Precio base</FormLabel>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={variable.basePrice || ''}
                                  onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'basePrice', parseFloat(e.target.value) || 0)}
                                  className="pl-7"
                                />
                              </div>
                            </div>
                            <div>
                              <FormLabel className="text-xs">Incremento por unidad</FormLabel>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={variable.priceIncrement || ''}
                                  onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'priceIncrement', parseFloat(e.target.value) || 0)}
                                  className="pl-7"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {variable.type === 'min_max' && (
                          <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded">
                            <div>
                              <FormLabel className="text-xs">Valor mínimo</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={variable.minValue || ''}
                                onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'minValue', parseInt(e.target.value) || 0)}
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">Valor máximo</FormLabel>
                              <Input
                                type="number"
                                min="0"
                                placeholder="100"
                                value={variable.maxValue || ''}
                                onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'maxValue', parseInt(e.target.value) || 100)}
                              />
                            </div>
                            <div>
                              <FormLabel className="text-xs">Precio por unidad</FormLabel>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={variable.pricePerUnit || ''}
                                  onChange={(e) => handleVariableChange(groupIndex, variableIndex, 'pricePerUnit', parseFloat(e.target.value) || 0)}
                                  className="pl-7"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {!['quantity', 'price', 'min_max'].includes(variable.type) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-xs">Opciones</FormLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddOption(groupIndex, variableIndex)}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Agregar Opción
                              </Button>
                            </div>
                            
                            {variable.options.map((option, optionIndex) => (
                              <div key={option.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                  <Input
                                    placeholder="Nombre de la opción"
                                    value={option.name}
                                    onChange={(e) => handleOptionChange(groupIndex, variableIndex, optionIndex, 'name', e.target.value)}
                                  />
                                </div>
                                <div className="col-span-3">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={option.price}
                                      onChange={(e) => handleOptionChange(groupIndex, variableIndex, optionIndex, 'price', parseFloat(e.target.value) || 0)}
                                      className="pl-7"
                                    />
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  <Input
                                    placeholder="Descripción (opcional)"
                                    value={option.description || ''}
                                    onChange={(e) => handleOptionChange(groupIndex, variableIndex, optionIndex, 'description', e.target.value)}
                                  />
                                </div>
                                <div className="col-span-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveOption(groupIndex, variableIndex, optionIndex)}
                                    disabled={variable.options.length <= 1}
                                    className="text-destructive hover:text-destructive/90"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={handleAddGroup}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Variable
        </Button>
      </div>
    </div>
  );
};

export default CustomVariablesEditor;