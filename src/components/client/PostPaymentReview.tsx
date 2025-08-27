
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
    if (!approved && !rejectionReason.trim()) {
      toast.error('Debe proporcionar un motivo para rechazar la factura');
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
  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revisar Factura Post-Pago
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Información del Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                  <p className="font-medium">{formatDate(appointment?.start_time)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tarifa Base:</span>
                  <p className="font-semibold text-primary">₡{invoice.base_price.toLocaleString()}</p>
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
              <CardContent className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.item_name}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₡{item.amount.toLocaleString()}</p>
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
                  <span>Tarifa Base:</span>
                  <span>₡{invoice.base_price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gastos Adicionales:</span>
                  <span>₡{totalItems.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total a Pagar:</span>
                  <span className="text-primary">₡{invoice.total_price.toLocaleString()}</span>
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
                    Explique por qué rechaza esta factura (requerido)
                  </Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ej: Los materiales parecen muy caros, necesito más detalles sobre..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            
            {!showRejectionForm ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectionForm(true)}
                  disabled={isProcessing}
                  className="flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </Button>
                <Button
                  onClick={() => handleApproval(true)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center gap-2"
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
                >
                  Cancelar Rechazo
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(false)}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="flex-1 flex items-center gap-2"
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
