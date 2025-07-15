import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { CustomVariable, CustomVariableOption } from '@/lib/types';

interface ServiceCustomVariablesEditorProps {
  customVariables: CustomVariable[];
  onVariablesChange: (variables: CustomVariable[]) => void;
}

const ServiceCustomVariablesEditor: React.FC<ServiceCustomVariablesEditorProps> = ({
  customVariables,
  onVariablesChange
}) => {
  const addCustomVariable = () => {
    const newVariable: CustomVariable = {
      id: uuidv4(),
      name: '',
      type: 'quantity',
      isRequired: false,
      options: [],
      pricePerUnit: 0,
      minQuantity: 1,
      maxQuantity: 10
    };
    onVariablesChange([...customVariables, newVariable]);
  };

  const removeCustomVariable = (index: number) => {
    const updated = [...customVariables];
    updated.splice(index, 1);
    onVariablesChange(updated);
  };

  const updateCustomVariable = (index: number, field: keyof CustomVariable, value: any) => {
    const updated = [...customVariables];
    updated[index] = { ...updated[index], [field]: value };
    onVariablesChange(updated);
  };

  const addOption = (variableIndex: number) => {
    const updated = [...customVariables];
    const newOption: CustomVariableOption = {
      id: uuidv4(),
      name: '',
      price: 0
    };
    updated[variableIndex].options.push(newOption);
    onVariablesChange(updated);
  };

  const removeOption = (variableIndex: number, optionIndex: number) => {
    const updated = [...customVariables];
    updated[variableIndex].options.splice(optionIndex, 1);
    onVariablesChange(updated);
  };

  const updateOption = (variableIndex: number, optionIndex: number, field: keyof CustomVariableOption, value: any) => {
    const updated = [...customVariables];
    updated[variableIndex].options[optionIndex] = { 
      ...updated[variableIndex].options[optionIndex], 
      [field]: value 
    };
    onVariablesChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-700">Variables adicionales</h4>
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={addCustomVariable}
        >
          <Plus className="h-4 w-4 mr-1" /> Agregar variable
        </Button>
      </div>

      {customVariables.map((variable, variableIndex) => (
        <Card key={variable.id} className="border-gray-200">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre de la variable</Label>
                    <Input
                      placeholder="Ej. Número de personas"
                      value={variable.name}
                      onChange={(e) => updateCustomVariable(variableIndex, 'name', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={variable.type}
                      onValueChange={(value) => updateCustomVariable(variableIndex, 'type', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quantity">Cantidad</SelectItem>
                        <SelectItem value="price">Precio</SelectItem>
                        <SelectItem value="min_max">Mínimo/Máximo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomVariable(variableIndex)}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {variable.type === 'quantity' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Precio por unidad</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={variable.pricePerUnit || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'pricePerUnit', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Mínimo</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={variable.minQuantity || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'minQuantity', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Máximo</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={variable.maxQuantity || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'maxQuantity', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {variable.type === 'price' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Precio base</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={variable.basePrice || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'basePrice', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Incremento</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={variable.priceIncrement || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'priceIncrement', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {variable.type === 'min_max' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Precio por unidad</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={variable.pricePerUnit || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'pricePerUnit', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor mínimo</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={variable.minValue || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'minValue', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Valor máximo</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={variable.maxValue || ''}
                      onChange={(e) => updateCustomVariable(variableIndex, 'maxValue', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {customVariables.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No hay variables adicionales configuradas</p>
          <p className="text-xs">Agregá variables como "Número de personas" o "Metros cuadrados"</p>
        </div>
      )}
    </div>
  );
};

export default ServiceCustomVariablesEditor;