import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvoices, usePaidInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, FileText, Download } from 'lucide-react';
import PostPaymentInvoicing from '@/components/provider/PostPaymentInvoicing';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { formatCurrency } from '@/utils/currencyUtils';

const ProviderInvoices: React.FC = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Fetch pending post-payment invoices (draft, rejected, submitted)
  const { data: pendingInvoices = [], refetch: refetchPending } = usePendingInvoices(user?.id);
  
  // Fetch all paid invoices (prepaid + postpaid approved)
  const { data: paidInvoices = [], refetch: refetchPaid, isLoading } = usePaidInvoices(user?.id);

  const handleInvoiceComplete = () => {
    setSelectedInvoice(null);
    refetchPending();
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

  const getStatusBadge = (status: string, rejectionReason?: string) => {
    switch (status) {
      case 'draft':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Pendiente de completar</span>;
      case 'submitted':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Pendiente aprobación cliente</span>;
      case 'rejected':
        return (
          <div className="space-y-1">
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Rechazada por cliente</span>
            {rejectionReason && (
              <p className="text-xs text-red-600 italic mt-1">{rejectionReason}</p>
            )}
          </div>
        );
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getInvoiceTypeLabel = (type: 'prepaid' | 'postpaid') => {
    return type === 'prepaid' ? 'Prepago' : 'Postpago';
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Facturas" 
        subtitle="Gestiona tus facturas postpago y revisa el historial de pagos"
      >
        {/* SECTION 1: Post-payment invoices */}
        <div className="mb-8 space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Facturas Postpago</h2>
            <p className="text-sm text-muted-foreground">
              Servicios completados que requieren desglose de costos adicionales
            </p>
          </div>

          {pendingInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No hay facturas postpago pendientes
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {pendingInvoices.map((invoice) => {
                const appointment = invoice.appointments;
                const isSubmitted = invoice.status === 'submitted';
                const isRejected = invoice.status === 'rejected';
                
                return (
                  <Card key={invoice.id} className={`border-l-4 ${
                    isRejected ? 'border-l-red-500' : 
                    isSubmitted ? 'border-l-blue-500' : 
                    'border-l-orange-500'
                  }`}>
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
                                  Cliente: {appointment?.client_name}
                                </p>
                              </div>
                              {!isSubmitted && (
                                <Button
                                  onClick={() => setSelectedInvoice(invoice)}
                                  variant={isRejected ? 'destructive' : 'default'}
                                  size="sm"
                                  className="ml-2"
                                >
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  {isRejected ? 'Corregir' : 'Completar'}
                                </Button>
                              )}
                            </div>
                            {getStatusBadge(invoice.status, invoice.rejection_reason)}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(appointment?.start_time)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>Total: {formatCurrency(invoice.total_price || 0)}</span>
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

        {/* SECTION 2: Paid invoices */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Facturas Pagadas</h2>
            <p className="text-sm text-muted-foreground">
              Historial de todas las transacciones completadas
            </p>
          </div>

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
          ) : paidInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pagadas
                </h3>
                <p className="text-sm text-muted-foreground">
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
                                <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                                  {getInvoiceTypeLabel(invoice.type)}
                                </span>
                                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                  Pagada
                                </span>
                              </div>
                              <h3 className="font-semibold text-base md:text-lg">
                                {invoice.service_title}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Cliente: {invoice.client_name}
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
                          <Clock className="w-4 h-4" />
                          <span>Pagado: {formatDate(invoice.payment_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">Total: {formatCurrency(invoice.amount || 0)}</span>
                        </div>
                        {invoice.payment_method_id && (
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">ID: {invoice.payment_method_id.slice(0, 8)}...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Invoicing Modal */}
        <PostPaymentInvoicing
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onSuccess={handleInvoiceComplete}
        />
      </PageContainer>
    </>
  );
};

export default ProviderInvoices;