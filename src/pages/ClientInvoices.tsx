import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedPaidInvoices } from '@/hooks/useInvoices';
import { useClientInvoices as usePostPaymentInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, FileText, Eye, Download, AlertCircle } from 'lucide-react';
import PostPaymentReview from '@/components/client/PostPaymentReview';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { formatCurrency } from '@/utils/currencyUtils';

const ClientInvoices: React.FC = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Fetch post-payment invoices that need review (status = 'submitted')
  const { data: postPaymentInvoices = [], refetch: refetchPostPayment, isLoading: isLoadingPostPayment } = usePostPaymentInvoices(user?.id);
  
  // Fetch all paid invoices (prepaid + postpaid approved)
  const { data: paidInvoices = [], refetch: refetchPaid, isLoading: isLoadingPaid } = useUnifiedPaidInvoices(user?.id, 'client');

  const handleReviewClose = () => {
    setSelectedInvoice(null);
  };

  const handleReviewSuccess = () => {
    setSelectedInvoice(null);
    refetchPostPayment();
    refetchPaid();
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

  const getInvoiceTypeBadge = (type: 'prepaid' | 'postpaid') => {
    return type === 'prepaid' ? (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
        Prepago
      </Badge>
    ) : (
      <Badge className="bg-orange-100 text-orange-800 border-orange-200">
        Postpago
      </Badge>
    );
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Facturas" 
        subtitle="Gestiona tus facturas y pagos"
      >
        {/* SECTION 1: Post-payment invoices pending review */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            <h2 className="text-xl font-semibold">Facturas Postpago - Pendientes de Revisión</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Estas facturas contienen gastos adicionales que el proveedor reportó después de completar el servicio. Revísalas y decide si aprobarlas o rechazarlas.
          </p>

          {isLoadingPostPayment ? (
            <div className="space-y-3 md:space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 md:p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : postPaymentInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <FileText className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pendientes de revisión
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Las facturas postpago que requieran tu aprobación aparecerán aquí.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {postPaymentInvoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-orange-500 bg-orange-50/30">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                    Postpago
                                  </Badge>
                                  <Badge variant="secondary">Pendiente de revisión</Badge>
                                </div>
                                <h3 className="font-semibold text-base md:text-lg">
                                  {appointment?.listings?.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Proveedor: {appointment?.provider_name}
                                </p>
                              </div>
                              <Button
                                onClick={() => setSelectedInvoice(invoice)}
                                variant="default"
                                size="sm"
                                className="ml-2"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Revisar
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="break-all">Fecha servicio: {formatDate(appointment?.start_time)}</span>
                          </div>
                          {invoice.submitted_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="break-all">Enviado: {formatDate(invoice.submitted_at)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="font-semibold">Total: {formatCurrency(invoice.total_price || 0)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: All paid invoices */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Facturas Pagadas</h2>
            <p className="text-sm text-muted-foreground">
              Historial completo de todas tus transacciones completadas (prepago y postpago)
            </p>
          </div>

          {isLoadingPaid ? (
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
          ) : paidInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-6 md:p-8 text-center">
                <FileText className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pagadas
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Aquí aparecerán todas tus facturas una vez completadas
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {paidInvoices.map((invoice) => (
                <Card key={`${invoice.type}-${invoice.id}`} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4 md:p-6">
                    <div className="space-y-3">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-xs font-mono text-muted-foreground">
                                  {invoice.invoice_number}
                                </span>
                                {getInvoiceTypeBadge(invoice.type)}
                                <Badge className="bg-green-100 text-green-800">Pagada</Badge>
                              </div>
                              <h3 className="font-semibold text-base md:text-lg">
                                {invoice.service_title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Proveedor: {invoice.provider_name}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="ml-2"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="break-all">Pagado: {formatDate(invoice.payment_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="font-semibold">Total: {formatCurrency(invoice.amount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
