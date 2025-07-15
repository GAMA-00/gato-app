import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Upload, DollarSign, FileText, Camera } from 'lucide-react';
import { useUpdateFinalPrice } from '@/hooks/usePostPaymentServices';
import { toast } from 'sonner';

const costItemSchema = z.object({
  description: z.string().min(1, 'Descripción requerida'),
  amount: z.coerce.number().min(0.01, 'Monto debe ser mayor a 0'),
});

const finalPriceSchema = z.object({
  baseCost: z.coerce.number().min(0, 'Costo base no puede ser negativo'),
  costItems: z.array(costItemSchema),
  notes: z.string().optional(),
});

type FinalPriceValues = z.infer<typeof finalPriceSchema>;

interface PostPaymentPricingProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: {
    id: string;
    client_name: string;
    service_name: string;
    start_time: string;
    end_time: string;
  };
  onSuccess: () => void;
}

const PostPaymentPricing: React.FC<PostPaymentPricingProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateFinalPrice } = useUpdateFinalPrice();

  const form = useForm<FinalPriceValues>({
    resolver: zodResolver(finalPriceSchema),
    defaultValues: {
      baseCost: 0,
      costItems: [
        { description: 'Mano de obra', amount: 0 }
      ],
      notes: '',
    },
  });

  const costItems = form.watch('costItems');
  const baseCost = form.watch('baseCost');

  const totalAmount = baseCost + costItems.reduce((sum, item) => sum + item.amount, 0);

  const addCostItem = () => {
    const current = form.getValues('costItems');
    form.setValue('costItems', [...current, { description: '', amount: 0 }]);
  };

  const removeCostItem = (index: number) => {
    const current = form.getValues('costItems');
    form.setValue('costItems', current.filter((_, i) => i !== index));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
      );
      setEvidenceFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: FinalPriceValues) => {
    setIsSubmitting(true);
    try {
      await updateFinalPrice(appointment.id, totalAmount, evidenceFiles);
      toast.success('Precio final establecido correctamente');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error setting final price:', error);
      toast.error('Error al establecer el precio final');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Establecer Precio Final
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <p><strong>Cliente:</strong> {appointment.client_name}</p>
            <p><strong>Servicio:</strong> {appointment.service_name}</p>
            <p><strong>Fecha:</strong> {formatDate(appointment.start_time)}</p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Base Cost */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Costo Base del Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="baseCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Costo base de mano de obra</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="pl-7"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Cost Items */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Gastos Adicionales</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCostItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar gasto
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {costItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <FormField
                      control={form.control}
                      name={`costItems.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="text-xs">Descripción</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej. Materiales, transporte..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`costItems.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="w-32">
                          <FormLabel className="text-xs">Monto</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                placeholder="0.00"
                                className="pl-7"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCostItem(index)}
                      disabled={costItems.length === 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Evidence Upload */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Evidencias (Facturas/Recibos)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="evidence-upload"
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="flex flex-col items-center gap-2 cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Subir fotos de facturas o recibos
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Formatos: JPG, PNG, PDF
                      </span>
                    </label>
                  </div>

                  {evidenceFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {evidenceFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 border rounded-lg"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas adicionales (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalles adicionales sobre los gastos..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Total Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Costo base:</span>
                    <span>${baseCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Gastos adicionales:</span>
                    <span>${costItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total final:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || totalAmount <= 0}
                className="flex-1"
              >
                {isSubmitting ? 'Procesando...' : 'Confirmar Precio Final'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PostPaymentPricing;