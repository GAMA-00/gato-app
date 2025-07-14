
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
  const isPostPayment = watch('isPostPayment') || false;

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-600" />
          Tipo de Precio
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
                    <div className="text-sm text-muted-foreground">Tarifas pre definidas</div>
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
                    <div className="font-medium">Post pago</div>
                    <div className="text-sm text-muted-foreground">Tarifa se define después del servicio</div>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentType"
                    value="ambas"
                    checked={field.value === "ambas"}
                    onChange={() => field.onChange("ambas")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-medium">Ambas</div>
                    <div className="text-sm text-muted-foreground">Ofrezco ambas modalidades</div>
                  </div>
                </label>
              </div>
            </FormItem>
          )}
        />

        {isPostPayment && (
          <div className="mt-4 p-4 bg-orange-100 border border-orange-200 rounded-lg">
            <h4 className="font-medium text-orange-800 mb-2">
              Importante para servicios post-pago:
            </h4>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• Los clientes verán una etiqueta "Post-pago" en tu servicio</li>
              <li>• Deberás realizar un desgloce de los gastos realizados, incluyendo fotos de facturas</li>
              <li>• El cobro se procesará automáticamente después del servicio</li>
              <li>• Deberás establecer una duración promedio para ordenar mejor tu agenda</li>
            </ul>
          </div>
        )}

        <FormMessage />
      </CardContent>
    </Card>
  );
};

export default PostPaymentToggle;
