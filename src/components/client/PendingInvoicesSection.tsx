import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientInvoices } from '@/hooks/usePostPaymentInvoices';
import PostPaymentReview from './PostPaymentReview';
import { formatCurrency } from '@/utils/currencyUtils';
import { Clock, DollarSign, Calendar, User, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PendingInvoicesSection: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  
  const { data: invoices = [], isLoading, refetch } = useClientInvoices();

  const handleReviewInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsReviewOpen(true);
  };

  const handleReviewClose = () => {
    setIsReviewOpen(false);
    setSelectedInvoice(null);
  };

  const handleReviewSuccess = () => {
    refetch();
  };

  const formatDate = (dateString: string) => {
    const formatted = new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  const getStatusBadge = (status: string, rejectionReason?: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Pendiente de Revisión</Badge>;
      case 'rejected':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">Rechazada</Badge>
            {rejectionReason && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]" title={rejectionReason}>
                {rejectionReason}
              </span>
            )}
          </div>
        );
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aprobada</Badge>;
      default:
        return <Badge variant="secondary">Borrador</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Facturas Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Facturas Pendientes ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="p-4 border rounded-lg space-y-3 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{invoice.appointments?.listings?.title}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(invoice.appointments?.start_time)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Enviada: {formatDate(invoice.submitted_at)}</span>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <div className="text-lg font-semibold text-primary">
                    {formatCurrency(invoice.total_price)}
                  </div>
                  {getStatusBadge(invoice.status, invoice.rejection_reason)}
                </div>
              </div>

              {invoice.status === 'rejected' && invoice.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Motivo del rechazo:</p>
                      <p className="text-sm text-red-700">{invoice.rejection_reason}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => handleReviewInvoice(invoice)}
                  variant={invoice.status === 'rejected' ? 'outline' : 'default'}
                  size="sm"
                >
                  {invoice.status === 'rejected' ? 'Ver Detalles' : 'Revisar Factura'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <PostPaymentReview
        isOpen={isReviewOpen}
        onClose={handleReviewClose}
        invoice={selectedInvoice}
        onSuccess={handleReviewSuccess}
      />
    </>
  );
};

export default PendingInvoicesSection;