import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { CustomVariableGroup, CustomVariable, CustomVariableOption } from '@/lib/types';

interface CustomerVariableSelection {
  [variableId: string]: {
    type: 'single' | 'multiple' | 'quantity';
    value: string | string[] | number;
    price: number;
  };
}

interface CustomVariableSelectorProps {
  customVariableGroups: CustomVariableGroup[];
  onSelectionChange: (selections: CustomerVariableSelection, totalPrice: number) => void;
  initialSelection?: CustomerVariableSelection;
}

const CustomVariableSelector: React.FC<CustomVariableSelectorProps> = ({
  customVariableGroups,
  onSelectionChange,
  initialSelection = {}
}) => {
  const [selections, setSelections] = useState<CustomerVariableSelection>(initialSelection);

  const calculatePrice = (variable: CustomVariable, value: string | string[] | number): number => {
    if (variable.type === 'quantity') {
      return (variable.pricePerUnit || 0) * (value as number);
    } else if (variable.type === 'single') {
      const option = variable.options.find(opt => opt.id === value);
      return option?.price || 0;
    } else if (variable.type === 'multiple') {
      const selectedOptions = variable.options.filter(opt => (value as string[]).includes(opt.id));
      return selectedOptions.reduce((total, opt) => total + opt.price, 0);
    }
    return 0;
  };

  const handleSelectionChange = (variableId: string, variable: CustomVariable, newValue: string | string[] | number) => {
    const price = calculatePrice(variable, newValue);
    
    const newSelections = {
      ...selections,
      [variableId]: {
        type: variable.type,
        value: newValue,
        price
      }
    };

    setSelections(newSelections);
    
    // Calculate total price
    const totalPrice = Object.values(newSelections).reduce((total, selection) => total + selection.price, 0);
    
    onSelectionChange(newSelections, totalPrice);
  };

  const renderSingleSelection = (variable: CustomVariable) => (
    <RadioGroup
      value={selections[variable.id]?.value as string || ''}
      onValueChange={(value) => handleSelectionChange(variable.id, variable, value)}
    >
      {variable.options.map((option) => (
        <div key={option.id} className="flex items-center space-x-2 border rounded p-3 hover:bg-gray-50">
          <RadioGroupItem value={option.id} id={option.id} />
          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">{option.name}</div>
                {option.description && (
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                )}
              </div>
              <Badge variant="secondary">+${option.price}</Badge>
            </div>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );

  const renderMultipleSelection = (variable: CustomVariable) => {
    const selectedValues = (selections[variable.id]?.value as string[]) || [];
    
    return (
      <div className="space-y-2">
        {variable.options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2 border rounded p-3 hover:bg-gray-50">
            <Checkbox
              id={option.id}
              checked={selectedValues.includes(option.id)}
              onCheckedChange={(checked) => {
                const newValues = checked 
                  ? [...selectedValues, option.id]
                  : selectedValues.filter(id => id !== option.id);
                handleSelectionChange(variable.id, variable, newValues);
              }}
            />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{option.name}</div>
                  {option.description && (
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  )}
                </div>
                <Badge variant="secondary">+${option.price}</Badge>
              </div>
            </Label>
          </div>
        ))}
      </div>
    );
  };

  const renderQuantitySelection = (variable: CustomVariable) => {
    const currentValue = (selections[variable.id]?.value as number) || variable.minQuantity || 1;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Cantidad</Label>
          <Badge variant="secondary">
            ${variable.pricePerUnit || 0} por unidad
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newValue = Math.max((variable.minQuantity || 1), currentValue - 1);
              handleSelectionChange(variable.id, variable, newValue);
            }}
            disabled={currentValue <= (variable.minQuantity || 1)}
          >
            -
          </Button>
          <Input
            type="number"
            value={currentValue}
            min={variable.minQuantity || 1}
            max={variable.maxQuantity || 100}
            onChange={(e) => {
              const value = parseInt(e.target.value) || variable.minQuantity || 1;
              handleSelectionChange(variable.id, variable, value);
            }}
            className="w-20 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const newValue = Math.min((variable.maxQuantity || 100), currentValue + 1);
              handleSelectionChange(variable.id, variable, newValue);
            }}
            disabled={currentValue >= (variable.maxQuantity || 100)}
          >
            +
          </Button>
        </div>
        {variable.minQuantity && (
          <p className="text-sm text-muted-foreground">
            Mínimo: {variable.minQuantity} unidades
          </p>
        )}
        {variable.maxQuantity && (
          <p className="text-sm text-muted-foreground">
            Máximo: {variable.maxQuantity} unidades
          </p>
        )}
      </div>
    );
  };

  const renderVariable = (variable: CustomVariable) => {
    switch (variable.type) {
      case 'single':
        return renderSingleSelection(variable);
      case 'multiple':
        return renderMultipleSelection(variable);
      case 'quantity':
        return renderQuantitySelection(variable);
      default:
        return null;
    }
  };

  if (!customVariableGroups || customVariableGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {customVariableGroups.map((group) => (
        <Card key={group.id} className="border">
          <CardHeader>
            <CardTitle className="text-lg">{group.name}</CardTitle>
            {group.description && (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {group.variables.map((variable) => (
              <div key={variable.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    {variable.name}
                    {variable.isRequired && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  {selections[variable.id] && (
                    <Badge variant="outline">
                      +${selections[variable.id].price.toFixed(2)}
                    </Badge>
                  )}
                </div>
                {renderVariable(variable)}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CustomVariableSelector;