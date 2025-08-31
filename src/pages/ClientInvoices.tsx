import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, FileText, Eye } from 'lucide-react';
import PostPaymentReview from '@/components/client/PostPaymentReview';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { formatCurrency } from '@/utils/currencyUtils';

const ClientInvoices: React.FC = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const { data: invoices = [], refetch, isLoading } = useClientInvoices(user?.id);

  const handleReviewClose = () => {
    setSelectedInvoice(null);
  };

  const handleReviewSuccess = () => {
    setSelectedInvoice(null);
    refetch();
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

  const getStatusBadge = (status: string, rejectionReason?: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">Pendiente de revisión</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'rejected':
        return (
          <div className="space-y-1">
            <Badge variant="destructive">Rechazada</Badge>
            {rejectionReason && (
              <p className="text-xs text-red-600 italic mt-1">{rejectionReason}</p>
            )}
          </div>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Facturas" 
        subtitle="Revisa y aprueba las facturas post-pago"
      >
        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pendientes
                </h3>
                <p className="text-sm text-muted-foreground">
                  No tienes facturas post-pago para revisar en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {appointment?.listings?.title}
                              </h3>
                              <p className="text-muted-foreground">
                                Proveedor: {appointment?.provider_name}
                              </p>
                            </div>
                            {getStatusBadge(invoice.status, invoice.rejection_reason)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDate(appointment?.start_time)}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              Total: {formatCurrency(invoice.total_price || 0)}
                            </div>
                          </div>

                          {invoice.status === 'submitted' && (
                            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                              <p className="font-medium">Factura lista para revisión</p>
                              <p>Revisa el desglose de gastos y decide si aprobar o rechazar.</p>
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => setSelectedInvoice(invoice)}
                          variant={invoice.status === 'submitted' ? 'default' : 'outline'}
                          className="ml-4"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {invoice.status === 'submitted' ? 'Revisar' : 'Ver Detalles'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Review Modal */}
        <PostPaymentReview
          isOpen={!!selectedInvoice}
          onClose={handleReviewClose}
          invoice={selectedInvoice}
          onSuccess={handleReviewSuccess}
        />
      </PageContainer>
    </>
  );
};

export default ClientInvoices;