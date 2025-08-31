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
        <div className="space-y-4 md:space-y-6">
          {isLoading ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 md:p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <FileText className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pendientes
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  No tienes facturas post-pago para revisar en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {invoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-base md:text-lg">
                                {appointment?.listings?.title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Proveedor: {appointment?.provider_name}
                              </p>
                            </div>
                            {getStatusBadge(invoice.status, invoice.rejection_reason)}
                          </div>
                          
                          <Button
                            onClick={() => setSelectedInvoice(invoice)}
                            variant={invoice.status === 'submitted' ? 'default' : 'outline'}
                            size="sm"
                            className="w-full md:w-auto"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {invoice.status === 'submitted' ? 'Revisar' : 'Ver Detalles'}
                          </Button>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="break-all">{formatDate(appointment?.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                            <span>Total: {formatCurrency(invoice.total_price || 0)}</span>
                          </div>
                        </div>

                        {invoice.status === 'submitted' && (
                          <div className="text-xs md:text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                            <p className="font-medium">Factura lista para revisión</p>
                            <p className="text-xs md:text-sm">Revisa el desglose de gastos y decide si aprobar o rechazar.</p>
                          </div>
                        )}
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