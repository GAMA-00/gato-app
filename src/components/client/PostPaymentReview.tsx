import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { useInvoiceApprovalMutation, useInvoiceItems } from '@/hooks/usePostPaymentInvoices';
import { toast } from 'sonner';

interface PostPaymentReviewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any; // From client invoices query
  onSuccess: () => void;
}

const PostPaymentReview: React.FC<PostPaymentReviewProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { data: invoiceItems = [] } = useInvoiceItems(invoice?.id);
  const approvalMutation = useInvoiceApprovalMutation();

  const handleApproval = async (approved: boolean) => {
    if (!approved && !rejectionReason.trim()) {
      toast.error('Por favor, proporciona una razón para el rechazo');
      return;
    }

    setIsProcessing(true);
    try {
      await approvalMutation.mutateAsync({
        invoiceId: invoice.id,
        approved,
        rejectionReason: approved ? undefined : rejectionReason
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing approval:', error);
    } finally {
      setIsProcessing(false);
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
  const additionalTotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revisión de Factura
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Servicio Realizado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium">{appointment?.listings?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor:</span>
                <span className="font-medium">{appointment?.provider_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{formatDate(appointment?.start_time)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Desglose de Costos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Tarifa Base:</span>
                <span className="font-medium">₡{invoice.base_price.toLocaleString()}</span>
              </div>
              
              {invoiceItems.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Costos Adicionales:</p>
                    {invoiceItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm pl-4">
                        <span className="text-muted-foreground">{item.description}:</span>
                        <span>₡{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              <Separator />
              <div className="flex justify-between font-semibold text-primary">
                <span>Total:</span>
                <span>₡{invoice.total_price.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Evidence */}
          {invoice.evidence_file_url && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Comprobante
                </CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={invoice.evidence_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Ver comprobante de gastos
                </a>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason Input */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <Label htmlFor="rejection-reason" className="text-sm font-medium mb-2 block">
                Razón del rechazo (si aplica):
              </Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Si rechazas esta factura, explica el motivo para que el proveedor pueda hacer los ajustes necesarios..."
                className="text-sm"
                rows={3}
              />
              <div className="flex items-start gap-2 mt-3 text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Si rechazas esta factura, será devuelta al proveedor para que realice los ajustes necesarios.
                  Solo podrás proceder con el pago una vez que apruebes una factura.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleApproval(false)}
              disabled={isProcessing || !rejectionReason.trim()}
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {isProcessing ? 'Rechazando...' : 'Rechazar'}
            </Button>
            
            <Button
              onClick={() => handleApproval(true)}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {isProcessing ? 'Aprobando...' : 'Aprobar y Pagar'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2">
            Al aprobar, autorizas el cobro del monto total mostrado
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostPaymentReview;