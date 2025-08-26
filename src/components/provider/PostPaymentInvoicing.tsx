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
import { Plus, Minus, Upload, FileImage, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceMutation, useSubmitInvoiceMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';

const invoiceItemSchema = z.object({
  description: z.string().min(1, 'La descripción es requerida'),
  amount: z.number().min(0, 'El monto debe ser positivo')
});

const invoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(0),
  notes: z.string().optional()
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface PostPaymentInvoicingProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // From pending invoices query
  onSuccess: () => void;
}

const PostPaymentInvoicing: React.FC<PostPaymentInvoicingProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: existingItems = [] } = useInvoiceItems(invoice?.id);
  const invoiceMutation = useInvoiceMutation();
  const submitMutation = useSubmitInvoiceMutation();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [],
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
        description: item.description,
        amount: item.amount
      })));
    } else if (fields.length === 0) {
      // Add one empty item by default
      append({ description: '', amount: 0 });
    }
  }, [existingItems, form, append, fields.length]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (validFiles.length !== files.length) {
      toast.error('Solo se permiten imágenes y archivos PDF');
    }
    
    setEvidenceFiles(prev => [...prev, ...validFiles].slice(0, 5));
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    const itemsTotal = form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0);
    return invoice?.appointments?.listings?.base_price || 0 + itemsTotal;
  };

  const onSubmit = async (data: InvoiceFormData, submitForApproval = false) => {
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const appointment = invoice.appointments;
      const basePrice = appointment?.listings?.base_price || 0;
      const totalPrice = basePrice + data.items.reduce((sum, item) => sum + item.amount, 0);

      const invoiceData = {
        id: invoice.id,
        appointment_id: appointment.id,
        provider_id: invoice.provider_id,
        client_id: invoice.client_id,
        base_price: basePrice,
        total_price: totalPrice,
        status: submitForApproval ? 'submitted' as const : 'draft' as const,
        ...(submitForApproval && { submitted_at: new Date().toISOString() })
      };

      const invoiceId = await invoiceMutation.mutateAsync({
        invoiceData,
        items: data.items.filter((item): item is { description: string; amount: number } => 
          Boolean(item.description?.trim()) && typeof item.amount === 'number' && item.amount >= 0
        ),
        evidenceFile: evidenceFiles[0] // Take first file as evidence
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Facturación Post-Pago
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tarifa Base:</span>
                <span className="font-semibold text-primary">₡{basePrice.toLocaleString()}</span>
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
                    <p className="font-medium text-red-800">Factura rechazada</p>
                    <p className="text-sm text-red-700">{invoice.rejection_reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))}>
            {/* Cost Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Costos Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Descripción</Label>
                      <Input
                        {...form.register(`items.${index}.description`)}
                        placeholder="Ej: Materiales adicionales"
                        className="text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <Label className="text-xs">Monto (₡)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: '', amount: 0 })}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar ítem
                </Button>
              </CardContent>
            </Card>

            {/* Evidence Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Comprobantes (Opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      id="evidence-upload"
                    />
                    <Label
                      htmlFor="evidence-upload"
                      className="flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Subir Comprobante
                    </Label>
                  </div>
                  
                  {evidenceFiles.length > 0 && (
                    <div className="space-y-2">
                      {evidenceFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                          <div className="flex items-center gap-2">
                            <FileImage className="w-4 h-4" />
                            <span>{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notas Adicionales</Label>
              <Textarea
                {...form.register('notes')}
                placeholder="Observaciones sobre el servicio prestado..."
                className="mt-1 text-sm"
              />
            </div>

            {/* Total */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tarifa Base:</span>
                    <span>₡{basePrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Costos Adicionales:</span>
                    <span>₡{form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-primary">₡{calculateTotal().toLocaleString()}</span>
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