
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Clock, DollarSign, X, Trash2, 
  FileText, Receipt, MessageSquare, 
  AlertCircle, Send, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceMutation, useSubmitInvoiceMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';
import { EvidenceUploader } from './EvidenceUploader';

const invoiceItemSchema = z.object({
  item_name: z.string()
    .min(1, 'Requerido')
    .max(100, 'Máximo 100 caracteres'),
  amount: z.number()
    .min(0.01, 'Monto inválido')
    .max(999999.99, 'Monto muy alto'),
  evidenceFile: z.any().optional()
});

const invoiceSchema = z.object({
  items: z.array(invoiceItemSchema).min(1, 'Debe agregar al menos un ítem'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional()
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
  const [itemFiles, setItemFiles] = useState<{ [key: number]: { file?: File; existingUrl?: string } }>({});
  const [itemsLoaded, setItemsLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { data: existingItems = [] } = useInvoiceItems(invoice?.id);
  const invoiceMutation = useInvoiceMutation();
  const submitMutation = useSubmitInvoiceMutation();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{ item_name: '', amount: 0 }],
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  // Load existing items ONCE when modal opens
  useEffect(() => {
    if (!itemsLoaded) {
      if (existingItems.length > 0) {
        const hasEmptyInitialItem = fields.length === 1 && 
          !form.getValues('items.0.item_name') && 
          form.getValues('items.0.amount') === 0;

        if (fields.length === 0 || hasEmptyInitialItem) {
          form.setValue('items', existingItems.map(item => ({
            item_name: item.item_name || '',
            amount: item.amount,
            evidenceFile: undefined
          })));
          
          // 🆕 Cargar URLs de evidencias existentes
          const existingFiles: { [key: number]: { existingUrl?: string } } = {};
          existingItems.forEach((item, index) => {
            if (item.evidence_file_url) {
              existingFiles[index] = { existingUrl: item.evidence_file_url };
            }
          });
          setItemFiles(existingFiles);
          
          setItemsLoaded(true);
        }
      } else if (fields.length === 0) {
        append({ item_name: '', amount: 0 });
        setItemsLoaded(true);
      }
    }
  }, [existingItems.length, itemsLoaded]);

  // Watch for unsaved changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const handleFileUpload = (index: number, file: File | null) => {
    setItemFiles(prev => ({
      ...prev,
      [index]: file ? { file } : { existingUrl: prev[index]?.existingUrl }
    }));
  };

  // Calculation functions
  const calculateSubtotal = () => {
    return form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateIVA = () => {
    return calculateSubtotal() * 0.13; // IVA fijo del 13%
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateIVA();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };


  const onSubmit = async (data: InvoiceFormData, submitForApproval = false) => {
    if (!invoice) return;

    if (submitForApproval) {
      setIsSubmitting(true);
    }
    
    try {
      const appointment = invoice.appointments;
      const subtotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxes = subtotal * 0.13; // IVA fijo del 13%
      const totalPrice = subtotal + taxes;

      // Prepare items with evidence files and existing URLs
      const itemsWithEvidence = data.items.map((item, index) => {
        const fileData = itemFiles[index];
        return {
          item_name: item.item_name,
          amount: item.amount,
          evidenceFile: fileData?.file, // Archivo nuevo (si existe)
          existingUrl: fileData?.existingUrl // URL existente (si existe)
        };
      });

      const invoiceData = {
        id: invoice.id,
        appointment_id: appointment.id,
        provider_id: invoice.provider_id,
        client_id: invoice.client_id,
        base_price: 0, // Base price is charged at booking, not in post-payment
        total_price: totalPrice,
        status: submitForApproval ? 'submitted' as const : 'draft' as const,
        ...(submitForApproval && { 
          submitted_at: new Date().toISOString(),
          rejection_reason: null // Clear rejection reason when resubmitting
        })
      };

      const invoiceId = await invoiceMutation.mutateAsync({
        invoiceData,
        items: itemsWithEvidence
      });

      if (submitForApproval) {
        await submitMutation.mutateAsync(invoiceId);
        toast.success('Factura enviada al cliente');
        setHasUnsavedChanges(false);
        onSuccess();
        onClose();
      } else {
        // Manual draft save
        toast.success('Borrador guardado');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Error al guardar la factura');
    } finally {
      if (submitForApproval) {
        setIsSubmitting(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const formatted = new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (!invoice) return null;

  const appointment = invoice.appointments;
  const basePrice = appointment?.listings?.base_price || 0;

  const handleClose = () => {
    setItemsLoaded(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full md:max-w-4xl h-[96vh] md:h-[92vh] max-h-[900px] flex flex-col mx-2 md:mx-auto p-0 overflow-hidden">
        {/* Header fijo */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold">Desglose Postpago</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Servicio: {appointment?.listings?.title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 text-xs text-amber-600 mr-2">
                <AlertCircle className="h-3 w-3" />
                <span className="hidden md:inline">Cambios sin guardar</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>


        {/* Rejection Reason */}
        {invoice.status === 'rejected' && invoice.rejection_reason && (
          <div className="mx-4 md:mx-6 mt-4 p-3 border border-red-200 bg-red-50 rounded-lg">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800 text-sm">Factura rechazada por el cliente</p>
                <p className="text-xs text-red-700 mt-1">{invoice.rejection_reason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal con scroll */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
          {/* 1. Resumen del Servicio */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Resumen del Servicio</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Servicio</span>
                  <span className="font-medium">{appointment?.listings?.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Cliente</span>
                  <span className="font-medium">{appointment?.client_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Fecha y hora</span>
                  <span className="font-medium">{formatDate(appointment?.start_time)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Gastos Adicionales */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Gastos Adicionales</h3>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {fields.length} {fields.length === 1 ? 'gasto' : 'gastos'}
                </span>
              </div>

              {/* Lista de gastos */}
              <div className="space-y-3">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Agrega gastos para calcular el total</p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <ItemCard
                      key={field.id}
                      index={index}
                      form={form}
                      onRemove={() => remove(index)}
                      canRemove={fields.length > 1}
                      itemFile={itemFiles[index]}
                      onFileChange={(file) => handleFileUpload(index, file)}
                      formatCurrency={formatCurrency}
                    />
                  ))
                )}
              </div>

              {/* Botón agregar */}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ item_name: '', amount: 0 })}
                className="w-full mt-4 border-dashed h-10"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar gasto
              </Button>
            </CardContent>
          </Card>

          {/* 3. Observaciones */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Observaciones</h3>
              </div>
              <Textarea
                {...form.register('notes')}
                placeholder="Comentarios adicionales sobre el servicio (máx. 500 caracteres)..."
                className="min-h-[100px] resize-none text-sm"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-2 text-right">
                {form.watch('notes')?.length || 0}/500
              </p>
            </CardContent>
          </Card>

          {/* 4. Resumen Final */}
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Resumen Final</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA 13%:</span>
                  <span className="font-medium">{formatCurrency(calculateIVA())}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Botones de acción */}
        <div className="border-t bg-background">
          <div className="px-4 md:px-6 py-3 flex flex-col-reverse md:flex-row gap-2 md:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.handleSubmit((data) => onSubmit(data, false))()}
              disabled={isSubmitting}
              className="flex-1 h-11"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar borrador
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (window.confirm(
                  `¿Enviar al cliente?\n\nTotal: ${formatCurrency(calculateTotal())}\n${fields.length} ítem(s)\n\nEsta acción notificará al cliente para su aprobación.`
                )) {
                  form.handleSubmit((data) => onSubmit(data, true))();
                }
              }}
              disabled={isSubmitting || fields.length === 0}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {invoice?.status === 'rejected' ? 'Reenviar al cliente' : 'Enviar al cliente'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ItemCard Component
interface ItemCardProps {
  index: number;
  form: any;
  onRemove: () => void;
  canRemove: boolean;
  itemFile: { file?: File; existingUrl?: string } | null | undefined;
  onFileChange: (file: File | null) => void;
  formatCurrency: (value: number) => string;
}

const ItemCard: React.FC<ItemCardProps> = ({
  index,
  form,
  onRemove,
  canRemove,
  itemFile,
  onFileChange,
  formatCurrency
}) => {

  return (
    <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      {/* Número del gasto */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">#{index + 1}</span>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden space-y-2">
        {/* Nombre y monto en una fila */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Nombre del gasto */}
          <div>
            <Label className="text-xs font-medium mb-1 block">
              Nombre del gasto <span className="text-red-500">*</span>
            </Label>
            <Input
              {...form.register(`items.${index}.item_name`)}
              placeholder="Ej: Materiales extra"
              className="h-9 text-sm"
            />
            {form.formState.errors.items?.[index]?.item_name && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {form.formState.errors.items[index]?.item_name?.message}
              </p>
            )}
          </div>

          {/* Monto */}
          <div>
            <Label className="text-xs font-medium mb-1 block">
              Monto <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                placeholder="0.00"
                className="h-9 text-sm pl-7"
              />
            </div>
            {form.formState.errors.items?.[index]?.amount && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.items[index]?.amount?.message}
              </p>
            )}
          </div>
        </div>

        {/* Evidencia */}
        <EvidenceUploader
          onFileSelect={onFileChange}
          currentFile={itemFile?.file || null}
          existingUrl={itemFile?.existingUrl}
          accept="image/*,.pdf"
          showLabel={true}
        />
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          title="Eliminar"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default PostPaymentInvoicing;
