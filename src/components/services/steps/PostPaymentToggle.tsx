
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
        <CardDescription>
          Define si el precio se establece antes o después del servicio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name="isPostPayment"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  El precio se definirá después del servicio
                </FormLabel>
                <FormDescription>
                  {isPostPayment 
                    ? "Los clientes reservarán sin ver el precio. Tú definirás el monto final después de completar el servicio."
                    : "El precio será visible para los clientes al momento de reservar."
                  }
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
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
              <li>• Deberás definir el precio final al completar cada cita</li>
              <li>• El cobro se procesará automáticamente después del servicio</li>
              <li>• Mantén la duración estimada para reservar correctamente la agenda</li>
            </ul>
          </div>
        )}

        <FormMessage />
      </CardContent>
    </Card>
  );
};

export default PostPaymentToggle;
