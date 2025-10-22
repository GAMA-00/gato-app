
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currencyUtils';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileImage, Calendar, User, DollarSign, AlertTriangle } from 'lucide-react';
import { useInvoiceApprovalMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';
import { toast } from 'sonner';

interface PostPaymentReviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  onSuccess: () => void;
}

const PostPaymentReview: React.FC<PostPaymentReviewProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: items = [] } = useInvoiceItems(invoice?.id);
  const approvalMutation = useInvoiceApprovalMutation();

  const handleApproval = async (approved: boolean) => {
    if (!approved) {
      if (!rejectionReason.trim()) {
        toast.error('Debe proporcionar un motivo para rechazar la factura');
        return;
      }
      if (rejectionReason.trim().length < 10) {
        toast.error('El motivo del rechazo debe tener al menos 10 caracteres');
        return;
      }
    }

    setIsProcessing(true);
    try {
      await approvalMutation.mutateAsync({
        invoiceId: invoice.id,
        approved,
        rejectionReason: approved ? undefined : rejectionReason
      });
      
      if (approved) {
        // Aprobar invoice primero
        await approvalMutation.mutateAsync({
          invoiceId: invoice.id,
          approved: true
        });

        // Capturar pago postpago con OnvoPay
        console.log('💳 Capturando pago postpago para invoice:', invoice.id);
        try {
          const { data: captureData, error: captureError } = await supabase.functions.invoke(
            'onvopay-capture-on-invoice-approval',
            {
              body: {
                invoiceId: invoice.id,
                totalAmount: invoice.total_price
              }
            }
          );

          if (captureError || !captureData?.success) {
            console.error('❌ Error capturando pago postpago:', captureError || captureData?.error);
            toast.error('Error al procesar el pago. Intente nuevamente.');
            return;
          }

          console.log('✅ Pago postpago capturado exitosamente');
          toast.success('Factura aprobada y pago procesado correctamente.');
        } catch (paymentError) {
          console.error('Error processing payment:', paymentError);
          toast.error('Error al procesar el pago. Intente nuevamente.');
          return;
        }
      } else {
        await approvalMutation.mutateAsync({
          invoiceId: invoice.id,
          approved: false,
          rejectionReason
        });
        toast.success('Factura rechazada. El proveedor recibirá tu comentario y podrá corregirla.');
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error('Error al procesar la respuesta. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
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
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto mx-2 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revisar Factura Post-Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 md:space-y-6">
          {/* Service Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Información del Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Servicio:</span>
                  <p className="font-medium">{appointment?.listings?.title}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Proveedor:</span>
                  <p className="font-medium">{appointment?.provider_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <p className="font-medium text-xs md:text-sm">{formatDate(appointment?.start_time)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Desglose de Gastos Adicionales</CardTitle>
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground">No se reportaron gastos adicionales</p>
              )}
            </CardHeader>
            {items.length > 0 && (
              <CardContent className="space-y-3 md:space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-3 md:p-4 border rounded-lg space-y-2">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.item_name}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="font-semibold">{formatCurrency(item.amount)}</p>
                      </div>
                    </div>
                    
                    {item.evidence_file_url && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileImage className="w-3 h-3" />
                        <a 
                          href={item.evidence_file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          Ver evidencia
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Total Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Gastos Adicionales:</span>
                  <span>{formatCurrency(totalItems)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total a Pagar:</span>
                  <span className="text-primary">{formatCurrency(totalItems)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rejection Form */}
          {showRejectionForm && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="w-4 h-4" />
                  Motivo del Rechazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-sm">
                    Explique por qué rechaza esta factura (requerido, mínimo 10 caracteres)
                  </Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ej: Los materiales parecen muy caros, necesito más detalles sobre los costos específicos..."
                    className="min-h-[100px]"
                  />
                  {rejectionReason.trim().length > 0 && rejectionReason.trim().length < 10 && (
                    <p className="text-xs text-red-600 mt-1">
                      Faltan {10 - rejectionReason.trim().length} caracteres (mínimo 10)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
              className="order-1 md:order-none"
            >
              Cancelar
            </Button>
            
            {!showRejectionForm ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 order-3 md:order-none"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleApproval(true)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center gap-2 order-2 md:order-none"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Aprobar y Proceder al Pago'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionForm(false);
                    setRejectionReason('');
                  }}
                  disabled={isProcessing}
                  className="order-3 md:order-none"
                >
                  Cancelar Rechazo
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(false)}
                  disabled={isProcessing || !rejectionReason.trim() || rejectionReason.trim().length < 10}
                  className="flex-1 flex items-center justify-center gap-2 order-2 md:order-none"
                >
                  <XCircle className="w-4 h-4" />
                  {isProcessing ? 'Procesando...' : 'Confirmar Rechazo'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostPaymentReview;
