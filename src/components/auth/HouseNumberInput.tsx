
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Home } from 'lucide-react';

interface HouseNumberInputProps {
  form: any;
  isSubmitting?: boolean;
  disabled?: boolean;
}

const HouseNumberInput: React.FC<HouseNumberInputProps> = ({ 
  form, 
  isSubmitting = false,
  disabled = false 
}) => {
  return (
    <FormField
      control={form.control}
      name="houseNumber"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-base font-medium">Número de Casa</FormLabel>
          <FormControl>
            <div className="relative">
              <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Número o identificador de su casa"
                className="pl-10 h-12 text-base"
                {...field}
                disabled={isSubmitting || disabled}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default HouseNumberInput;
