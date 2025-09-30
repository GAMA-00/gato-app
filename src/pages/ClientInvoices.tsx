import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientInvoices } from '@/hooks/useInvoices';
import { useClientInvoices as usePostPaymentInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, DollarSign, FileText, Eye, Download } from 'lucide-react';
import PostPaymentReview from '@/components/client/PostPaymentReview';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { formatCurrency } from '@/utils/currencyUtils';

const ClientInvoices: React.FC = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Fetch unified invoices (all services)
  const { data: invoices = [], refetch, isLoading } = useClientInvoices(statusFilter);
  
  // Fetch post-payment invoices that need review
  const { data: postPaymentInvoices = [], refetch: refetchPostPayment } = usePostPaymentInvoices(user?.id);

  const handleReviewClose = () => {
    setSelectedInvoice(null);
  };

  const handleReviewSuccess = () => {
    setSelectedInvoice(null);
    refetch();
    refetchPostPayment();
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Pagada</Badge>;
      case 'pending_payment':
        return <Badge variant="secondary">Pendiente de pago</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Pendiente de revisión</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Facturas" 
        subtitle="Revisa tus facturas y servicios completados"
      >
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="completed">Completadas</TabsTrigger>
            <TabsTrigger value="paid">Pagadas</TabsTrigger>
            <TabsTrigger value="pending_payment">Pendientes</TabsTrigger>
          </TabsList>
          
          <TabsContent value={statusFilter} className="space-y-4 md:space-y-6">
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
                  No hay facturas
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'No tienes facturas en este momento.'
                    : `No tienes facturas ${statusFilter === 'completed' ? 'completadas' : statusFilter === 'paid' ? 'pagadas' : 'pendientes'}.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {invoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {invoice.invoice_number}
                                  </span>
                                  {getStatusBadge(invoice.status)}
                                </div>
                                <h3 className="font-semibold text-base md:text-lg">
                                  {appointment?.listings?.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Proveedor: {appointment?.provider_name}
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
                            <span className="break-all">{formatDate(invoice.invoice_date)}</span>
                          </div>
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
          </TabsContent>
        </Tabs>

        {/* Post-payment invoices pending review */}
        {postPaymentInvoices.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold">Facturas post-pago pendientes de revisión</h2>
            <div className="space-y-3">
              {postPaymentInvoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-start justify-between">
                              <div>
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
                            <Badge variant="secondary">Pendiente de revisión</Badge>
                          </div>
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
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

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