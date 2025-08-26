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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const PostPaymentToggle: React.FC = () => {
  const { control, watch } = useFormContext();
  const paymentType = watch('isPostPayment') || false;

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Tipo de tarifa
        </CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="isPostPayment"
          render={({ field }) => (
            <FormItem className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
        <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="paymentType"
            value="prepago"
            checked={field.value === false}
            onChange={() => field.onChange(false)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">Pre-pago</div>
            <div className="text-sm text-muted-foreground">Precio fijo definido al crear anuncio</div>
          </div>
        </label>
        
        <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
          <input
            type="radio"
            name="paymentType"
            value="postpago"
            checked={field.value === true}
            onChange={() => field.onChange(true)}
            className="w-4 h-4 text-blue-600"
          />
          <div>
            <div className="font-medium">Post-pago</div>
            <div className="text-sm text-muted-foreground">Tarifa base + costos adicionales al finalizar</div>
          </div>
        </label>
              </div>
            </FormItem>
          )}
        />

        {paymentType === true && (
          <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">
              Importante para servicios post-pago:
            </h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Los clientes verán una etiqueta "Post-pago" en tu servicio</li>
              <li>• Debes definir una <strong>tarifa base obligatoria</strong> que se cobra al reservar</li>
              <li>• Al finalizar el servicio, completarás un desglose de costos adicionales</li>
              <li>• El cliente debe aprobar la factura antes del cobro final</li>
            </ul>
          </div>
        )}

        <FormMessage />
      </CardContent>
    </Card>
  );
};

export default PostPaymentToggle;