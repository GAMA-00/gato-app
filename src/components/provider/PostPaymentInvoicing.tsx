
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, Upload, FileImage, Clock, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceMutation, useSubmitInvoiceMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';

const invoiceItemSchema = z.object({
  item_name: z.string().min(1, 'El nombre del gasto es requerido'),
  description: z.string().optional(),
  amount: z.number().min(0, 'El monto debe ser positivo'),
  evidenceFile: z.any().optional()
});

const invoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Debe agregar al menos un ítem'),
  notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface PostPaymentInvoicingProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

const PostPaymentInvoicing: React.FC<PostPaymentInvoicingProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemFiles, setItemFiles] = useState<{ [key: number]: File | null }>({});
  
  const { data: existingItems = [] } = useInvoiceItems(invoice?.id);
  const invoiceMutation = useInvoiceMutation();
  const submitMutation = useSubmitInvoiceMutation();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{ item_name: '', description: '', amount: 0 }],
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  // Load existing items when invoice changes
  useEffect(() => {
    if (existingItems.length > 0) {
      form.setValue('items', existingItems.map(item => ({
        item_name: item.item_name || '',
        description: item.description || '',
        amount: item.amount,
        evidenceFile: undefined
      })));
    } else if (fields.length === 0) {
      // Add one empty item by default
      append({ item_name: '', description: '', amount: 0 });
    }
  }, [existingItems, form, append, fields.length]);

  const handleFileUpload = (index: number, file: File | null) => {
    setItemFiles(prev => ({
      ...prev,
      [index]: file
    }));
  };

  const calculateTotal = () => {
    const itemsTotal = form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0);
    return itemsTotal; // Only additional costs, base price is charged at booking
  };

  const onSubmit = async (data: InvoiceFormData, submitForApproval = false) => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const appointment = invoice.appointments;
      const totalPrice = data.items.reduce((sum, item) => sum + (item.amount || 0), 0); // Only additional costs

      // Prepare items with evidence files
      const itemsWithEvidence = data.items.map((item, index) => ({
        item_name: item.item_name,
        description: item.description || undefined,
        amount: item.amount,
        evidenceFile: itemFiles[index] || undefined
      }));

      const invoiceData = {
        id: invoice.id,
        appointment_id: appointment.id,
        provider_id: invoice.provider_id,
        client_id: invoice.client_id,
        base_price: 0, // Base price is charged at booking, not in post-payment
        total_price: totalPrice,
        status: submitForApproval ? 'submitted' as const : 'draft' as const,
        ...(submitForApproval && { submitted_at: new Date().toISOString() })
      };

      const invoiceId = await invoiceMutation.mutateAsync({
        invoiceData,
        items: itemsWithEvidence
      });

      if (submitForApproval) {
        await submitMutation.mutateAsync(invoiceId);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving invoice:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!invoice) return null;

  const appointment = invoice.appointments;
  const basePrice = appointment?.listings?.base_price || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Desglose de Gastos - Post Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Información del Servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium">{appointment?.listings?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">{appointment?.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{formatDate(appointment?.start_time)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Rejection Reason if applicable */}
          {invoice.status === 'rejected' && invoice.rejection_reason && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-red-600 mt-1" />
                  <div>
                    <p className="font-medium text-red-800">Factura rechazada por el cliente</p>
                    <p className="text-sm text-red-700 mt-1">{invoice.rejection_reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))}>
            {/* Cost Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Gastos Adicionales</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Detalle todos los gastos adicionales incurridos durante el servicio
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-sm">Ítem #{index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-medium">Nombre del gasto *</Label>
                        <Input
                          {...form.register(`items.${index}.item_name`)}
                          placeholder="Ej: Materiales extra"
                          className="text-sm"
                        />
                        {form.formState.errors.items?.[index]?.item_name && (
                          <p className="text-xs text-red-600 mt-1">
                            {form.formState.errors.items[index]?.item_name?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs font-medium">Monto ($) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                          placeholder="0.00"
                          className="text-sm"
                        />
                        {form.formState.errors.items?.[index]?.amount && (
                          <p className="text-xs text-red-600 mt-1">
                            {form.formState.errors.items[index]?.amount?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Descripción (opcional)</Label>
                      <Textarea
                        {...form.register(`items.${index}.description`)}
                        placeholder="Detalles adicionales sobre este gasto..."
                        className="text-sm h-20"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-medium">Evidencia (opcional)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(index, e.target.files?.[0] || null)}
                          className="text-sm"
                        />
                        {itemFiles[index] && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <FileImage className="w-3 h-3" />
                            {itemFiles[index]?.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ item_name: '', description: '', amount: 0 })}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar otro gasto
                </Button>
              </CardContent>
            </Card>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Observaciones Generales</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Comentarios adicionales sobre el servicio..."
                className="mt-1 text-sm"
              />
            </div>

            {/* Total */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gastos Adicionales:</span>
                    <span>${form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">${form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="secondary" disabled={isSubmitting}>
                Guardar Borrador
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit((data) => onSubmit(data, true))}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar al Cliente'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostPaymentInvoicing;
