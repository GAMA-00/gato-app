import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedPaidInvoices } from '@/hooks/useInvoices';
import { useClientInvoices as usePostPaymentInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, DollarSign, FileText, Eye, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import PostPaymentReview from '@/components/client/PostPaymentReview';
import PageLayout from '@/components/layout/PageLayout';
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

  // Componente para cards individuales de facturas
  interface InvoiceCardProps {
    invoice: any;
    type: 'pending' | 'paid';
    onReview?: (invoice: any) => void;
  }

  const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, type, onReview }) => {
    if (type === 'pending') {
      const appointment = invoice.appointments;
      
      return (
        <Card className="border-l-4 border-l-orange-500 shadow-sm transition-shadow hover:shadow-md">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header con título y badge de estado */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-[#2D2D2D] truncate mb-1">
                    {appointment?.listings?.title}
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    Proveedor: {appointment?.provider_name}
                  </p>
                </div>
                
                {/* Estado badge */}
                <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex-shrink-0">
                  Pendiente
                </Badge>
              </div>

              {/* Info adicional */}
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-sm text-orange-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Requiere tu revisión y aprobación
                </p>
              </div>

              {/* Metadata: fecha y monto */}
              <div className="flex flex-wrap gap-4 text-sm text-[#6B6B6B]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{formatDate(appointment?.start_time)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">{formatCurrency(invoice.total_price || 0)}</span>
                </div>
              </div>

              {/* CTA primario */}
              {onReview && (
                <Button
                  onClick={() => onReview(invoice)}
                  variant="default"
                  size="default"
                  className="w-full h-11 text-base"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Revisar Factura
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Type: paid
    return (
      <Card className="border-l-4 border-l-green-500 shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header con badges */}
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs font-mono text-[#6B6B6B] px-2 py-1 bg-muted rounded">
                {invoice.invoice_number}
              </span>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {invoice.type === 'prepaid' ? 'Prepago' : 'Postpago'}
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Pagada
              </Badge>
            </div>

            {/* Título y proveedor */}
            <div>
              <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">
                {invoice.service_title}
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Proveedor: {invoice.provider_name}
              </p>
            </div>

            {/* Metadata: fecha de pago y monto */}
            <div className="flex flex-wrap gap-4 text-sm text-[#6B6B6B]">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Pagado: {formatDate(invoice.payment_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold text-[#2D2D2D]">{formatCurrency(invoice.amount || 0)}</span>
              </div>
            </div>

            {/* Acción secundaria: Ver PDF */}
            <Button
              variant="outline"
              size="default"
              className="w-full h-11 text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Ver PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Navbar />
      <PageLayout 
        title="Facturas"
        subtitle="Gestiona tus facturas"
        className="min-h-screen"
      >
        <Tabs defaultValue="postpago" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="postpago" className="text-sm md:text-base">
              Post-pago {postPaymentInvoices.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {postPaymentInvoices.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pagadas" className="text-sm md:text-base">
              Pagadas
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Post-pago de Revisión */}
          <TabsContent value="postpago" className="space-y-4">
            {isLoadingPostPayment ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse border shadow-sm">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : postPaymentInvoices.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">
                    Sin facturas pendientes
                  </h3>
                  <p className="text-sm text-[#6B6B6B] max-w-sm">
                    Las facturas que requieran tu aprobación aparecerán aquí
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {postPaymentInvoices.map((invoice) => (
                  <InvoiceCard 
                    key={invoice.id} 
                    invoice={invoice} 
                    type="pending" 
                    onReview={setSelectedInvoice}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Content: Pagadas */}
          <TabsContent value="pagadas" className="space-y-4">
            {isLoadingPaid ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse border shadow-sm">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : paidInvoices.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">
                    No hay facturas pagadas
                  </h3>
                  <p className="text-sm text-[#6B6B6B] max-w-sm">
                    Verás aquí tu historial
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {paidInvoices.map((invoice) => (
                  <InvoiceCard 
                    key={`${invoice.type}-${invoice.id}`} 
                    invoice={invoice} 
                    type="paid" 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Review Modal */}
        <PostPaymentReview
          isOpen={!!selectedInvoice}
          onClose={handleReviewClose}
          invoice={selectedInvoice}
          onSuccess={handleReviewSuccess}
        />
      </PageLayout>
    </>
  );
};

export default ClientInvoices;
