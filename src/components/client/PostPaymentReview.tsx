
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currencyUtils';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileImage, Calendar, User, DollarSign, AlertTriangle, Download, Eye, File } from 'lucide-react';
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
      console.log(`🔄 Processing ${approved ? 'approval' : 'rejection'} for invoice:`, invoice.id);
      
      // La mutation ya maneja todo el flujo (incluido el cargo de pago T2 si es aprobado)
      await approvalMutation.mutateAsync({
        invoiceId: invoice.id,
        approved,
        rejectionReason: approved ? undefined : rejectionReason
      });
      
      if (approved) {
        toast.success('Factura aprobada y pago procesado correctamente.');
      } else {
        toast.success('Factura rechazada. El proveedor recibirá tu comentario y podrá corregirla.');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ Error processing approval:', error);
      toast.error(error.message || 'Error al procesar la respuesta. Intente nuevamente.');
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
  
  // Obtener evidencias de la factura y de los items
  const evidenceFromInvoice = invoice?.evidence_file_url
    ? [{
        id: `invoice-${invoice.id}`,
        itemName: 'Evidencia general',
        url: invoice.evidence_file_url,
        fileName: invoice.evidence_file_url.split('/').pop() || 'documento',
        isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(invoice.evidence_file_url)
      }]
    : [];

  const evidenceFromItems = items
    .filter(item => item.evidence_file_url)
    .map(item => ({
      id: item.id,
      itemName: item.item_name,
      url: item.evidence_file_url!,
      fileName: item.evidence_file_url!.split('/').pop() || 'documento',
      isImage: /\.(jpg|jpeg|png|gif|webp)$/i.test(item.evidence_file_url!)
    }));

  const evidences = [...evidenceFromInvoice, ...evidenceFromItems];

  const handlePreview = (url: string) => {
    window.open(url, '_blank');
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Archivo descargado correctamente');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto overflow-x-hidden mx-2 md:mx-auto w-[calc(100vw-1rem)] md:w-full">
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
            <CardContent className="space-y-3 p-4 md:p-6">
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
              <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6">
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
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Evidencias Adjuntas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                Evidencias Adjuntas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 md:p-6">
              {evidences.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay evidencias adjuntas</p>
              ) : (
                evidences.map((evidence) => (
                  <div 
                    key={evidence.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                      {evidence.isImage ? (
                        <FileImage className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium truncate">{evidence.itemName}</p>
                        <p className="text-xs text-muted-foreground truncate break-all">{evidence.fileName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(evidence.url)}
                        className="h-8 w-8 p-0"
                        title="Ver documento"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(evidence.url, evidence.fileName)}
                        className="h-8 w-8 p-0"
                        title="Descargar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
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
