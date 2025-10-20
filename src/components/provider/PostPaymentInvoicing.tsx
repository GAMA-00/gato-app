
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, FileImage, Clock, DollarSign, X, Copy, Trash2, 
  Paperclip, ChevronRight, FileText, Receipt, MessageSquare, 
  AlertCircle, Check, Send, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { useInvoiceMutation, useSubmitInvoiceMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';

const invoiceItemSchema = z.object({
  item_name: z.string()
    .min(1, 'Requerido')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string()
    .max(300, 'Máximo 300 caracteres')
    .optional(),
  amount: z.number()
    .min(0.01, 'Monto inválido')
    .max(999999.99, 'Monto muy alto'),
  tax_rate: z.number()
    .min(0)
    .max(100)
    .default(0),
  has_tax: z.boolean().default(false),
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

// Quick templates for common expenses
const quickTemplates = [
  { name: 'Materiales', tax: true, taxRate: 16 },
  { name: 'Transporte', tax: false, taxRate: 0 },
  { name: 'Mano de obra', tax: true, taxRate: 16 },
  { name: 'Equipos', tax: true, taxRate: 16 },
];

const PostPaymentInvoicing: React.FC<PostPaymentInvoicingProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemFiles, setItemFiles] = useState<{ [key: number]: File | null }>({});
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [openAccordions, setOpenAccordions] = useState<string[]>(['info', 'items', 'notes']);
  
  const { data: existingItems = [] } = useInvoiceItems(invoice?.id);
  const invoiceMutation = useInvoiceMutation();
  const submitMutation = useSubmitInvoiceMutation();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      items: [{ item_name: '', description: '', amount: 0, has_tax: false, tax_rate: 0 }],
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
        has_tax: false,
        tax_rate: 0,
        evidenceFile: undefined
      })));
    } else if (fields.length === 0) {
      append({ item_name: '', description: '', amount: 0, has_tax: false, tax_rate: 0 });
    }
  }, [existingItems, form, append, fields.length]);

  // Debounced autosave
  const debouncedAutoSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return async (data: InvoiceFormData) => {
        if (!invoice) return;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setAutoSaving(true);
          try {
            await onSubmit(data, false);
            setLastSaved(new Date());
          } catch (error) {
            console.error('Autosave failed:', error);
          } finally {
            setAutoSaving(false);
          }
        }, 2000);
      };
    })(),
    [invoice]
  );

  // Watch form changes for autosave
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (data.items && data.items.length > 0) {
        debouncedAutoSave(data as InvoiceFormData);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch, debouncedAutoSave]);

  const handleFileUpload = (index: number, file: File | null) => {
    setItemFiles(prev => ({
      ...prev,
      [index]: file
    }));
  };

  // Calculation functions
  const calculateSubtotal = () => {
    return form.watch('items').reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const calculateTaxes = () => {
    return form.watch('items').reduce((sum, item) => {
      if (item.has_tax && item.amount) {
        const taxAmount = (item.amount * (item.tax_rate || 0)) / 100;
        return sum + taxAmount;
      }
      return sum;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxes();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const applyTemplate = (template: typeof quickTemplates[0]) => {
    append({
      item_name: template.name,
      description: '',
      amount: 0,
      has_tax: template.tax,
      tax_rate: template.taxRate,
      evidenceFile: undefined
    });
  };

  const onSubmit = async (data: InvoiceFormData, submitForApproval = false) => {
    if (!invoice) return;

    if (submitForApproval) {
      setIsSubmitting(true);
    }
    
    try {
      const appointment = invoice.appointments;
      const subtotal = data.items.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxes = data.items.reduce((sum, item) => {
        if (item.has_tax && item.amount) {
          return sum + (item.amount * (item.tax_rate || 0)) / 100;
        }
        return sum;
      }, 0);
      const totalPrice = subtotal + taxes;

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
        onSuccess();
        onClose();
      } else if (!submitForApproval && lastSaved) {
        // Silent save for autosave
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Indicador de autoguardado */}
        {(autoSaving || lastSaved) && (
          <div className="px-4 md:px-6 py-2 bg-muted/50 border-b">
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {autoSaving ? (
                <>
                  <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                  Guardando borrador...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  Último guardado: {lastSaved?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </>
              )}
            </p>
          </div>
        )}

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
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 pb-8">
          <Accordion 
            type="multiple" 
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="space-y-3"
          >
            {/* 1. Información del servicio */}
            <AccordionItem value="info" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  Información del servicio
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
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
              </AccordionContent>
            </AccordionItem>

            {/* 2. Gastos adicionales */}
            <AccordionItem value="items" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Receipt className="h-4 w-4" />
                    Gastos adicionales
                  </div>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {fields.length} {fields.length === 1 ? 'ítem' : 'ítems'}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Plantillas rápidas */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Plantillas rápidas:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickTemplates.map((template) => (
                      <button
                        key={template.name}
                        type="button"
                        onClick={() => applyTemplate(template)}
                        className="px-3 py-1.5 text-xs border rounded-full hover:bg-muted transition-colors flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lista de ítems */}
                <div className="space-y-3">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Agrega ítems para calcular el total</p>
                      <p className="text-xs mt-1">Usa las plantillas rápidas o el botón "+ Agregar gasto"</p>
                    </div>
                  ) : (
                    fields.map((field, index) => (
                      <ItemCard
                        key={field.id}
                        index={index}
                        form={form}
                        onRemove={() => remove(index)}
                        onDuplicate={() => {
                          const item = form.getValues(`items.${index}`);
                          append({ ...item, evidenceFile: undefined });
                        }}
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
                  variant="ghost"
                  onClick={() => append({ 
                    item_name: '', 
                    description: '', 
                    amount: 0,
                    has_tax: false,
                    tax_rate: 0 
                  })}
                  className="w-full mt-4 border-2 border-dashed h-11"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar gasto
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* 3. Observaciones */}
            <AccordionItem value="notes" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Observaciones
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <Textarea
                  {...form.register('notes')}
                  placeholder="Comentarios adicionales sobre el servicio (máx. 500 caracteres)..."
                  className="min-h-[100px] resize-none text-sm"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {form.watch('notes')?.length || 0}/500
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Resumen sticky al pie */}
        <div className="sticky bottom-0 z-20 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {/* Resumen de cálculos */}
          <div className="px-4 md:px-6 py-3 space-y-2 bg-gradient-to-b from-muted/20 to-muted/40">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-foreground/70">Subtotal:</span>
              <span className="font-semibold text-foreground">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span className="text-foreground/70">Impuestos:</span>
              <span className="font-semibold text-foreground">{formatCurrency(calculateTaxes())}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-base md:text-lg font-bold">
              <span className="text-foreground">Total:</span>
              <span className="text-primary">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          {/* Acciones */}
          <div className="px-4 md:px-6 py-3 flex flex-col-reverse md:flex-row gap-2 md:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.handleSubmit((data) => onSubmit(data, false))()}
              disabled={isSubmitting || autoSaving}
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
              disabled={isSubmitting || autoSaving || fields.length === 0}
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
  onDuplicate: () => void;
  canRemove: boolean;
  itemFile: File | null | undefined;
  onFileChange: (file: File | null) => void;
  formatCurrency: (value: number) => string;
}

const ItemCard: React.FC<ItemCardProps> = ({
  index,
  form,
  onRemove,
  onDuplicate,
  canRemove,
  itemFile,
  onFileChange,
  formatCurrency
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <Card className="border shadow-sm">
      <CardContent className="p-3 md:p-4 space-y-2.5">
        {/* Header con acciones */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            ÍTEM #{index + 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              className="h-8 w-8"
              title="Duplicar"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              disabled={!canRemove}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Nombre del gasto */}
        <div>
          <Label className="text-xs font-medium mb-1.5 block">
            Nombre del gasto <span className="text-red-500">*</span>
          </Label>
          <Input
            {...form.register(`items.${index}.item_name`)}
            placeholder="Ej: Materiales extra"
            className="h-11 text-sm"
          />
          {form.formState.errors.items?.[index]?.item_name && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {form.formState.errors.items[index]?.item_name?.message}
            </p>
          )}
        </div>

        {/* Monto + IVA en una fila */}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          {/* Monto */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">
              Monto <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                step="0.01"
                {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                placeholder="0.00"
                className="h-11 text-sm pl-7"
              />
            </div>
            {form.formState.errors.items?.[index]?.amount && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.items[index]?.amount?.message}
              </p>
            )}
          </div>

          {/* Toggle IVA */}
          <div>
            <Label className="text-xs font-medium mb-1.5 block">IVA</Label>
            <div className="flex items-center gap-2 h-11">
              <Switch
                checked={form.watch(`items.${index}.has_tax`)}
                onCheckedChange={(checked) => {
                  form.setValue(`items.${index}.has_tax`, checked);
                  if (checked && !form.watch(`items.${index}.tax_rate`)) {
                    form.setValue(`items.${index}.tax_rate`, 16);
                  }
                }}
              />
              {form.watch(`items.${index}.has_tax`) && (
                <>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    {...form.register(`items.${index}.tax_rate`, { valueAsNumber: true })}
                    className="h-11 w-16 text-sm text-center"
                    placeholder="16"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Descripción colapsable */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-8 px-2"
            >
              <ChevronRight className="h-3 w-3 mr-1 transition-transform" />
              Descripción (opcional)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Textarea
              {...form.register(`items.${index}.description`)}
              placeholder="Detalles adicionales..."
              className="mt-2 min-h-[60px] resize-none text-sm"
              maxLength={300}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Evidencia */}
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full h-9 text-xs"
          >
            <Paperclip className="h-3 w-3 mr-2" />
            {itemFile ? 'Cambiar evidencia' : 'Adjuntar evidencia'}
          </Button>
          
          {showEvidence && (
            <div className="mt-2">
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                className="h-9 text-xs"
              />
            </div>
          )}

          {itemFile && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
              <FileImage className="h-3 w-3 text-green-600 flex-shrink-0" />
              <span className="truncate text-green-700 flex-1">{itemFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onFileChange(null)}
                className="h-6 w-6 text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        {/* Mostrar cálculo si tiene IVA */}
        {form.watch(`items.${index}.has_tax`) && form.watch(`items.${index}.amount`) > 0 && (
          <div className="pt-2 border-t space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal:</span>
              <span>{formatCurrency(form.watch(`items.${index}.amount`))}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA ({form.watch(`items.${index}.tax_rate`)}%):</span>
              <span>
                {formatCurrency(
                  (form.watch(`items.${index}.amount`) * form.watch(`items.${index}.tax_rate`)) / 100
                )}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total ítem:</span>
              <span>
                {formatCurrency(
                  form.watch(`items.${index}.amount`) +
                  (form.watch(`items.${index}.amount`) * form.watch(`items.${index}.tax_rate`)) / 100
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostPaymentInvoicing;
