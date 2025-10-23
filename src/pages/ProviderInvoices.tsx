import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvoices, usePaidInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Clock, DollarSign, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import PostPaymentInvoicing from '@/components/provider/PostPaymentInvoicing';
import PageLayout from '@/components/layout/PageLayout';
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

  // Componente para cards individuales de facturas
  interface InvoiceCardProps {
    invoice: any;
    type: 'pending' | 'paid';
    onEdit?: (invoice: any) => void;
  }

  const InvoiceCard: React.FC<InvoiceCardProps> = ({ invoice, type, onEdit }) => {
    if (type === 'pending') {
      const appointment = invoice.appointments;
      const isSubmitted = invoice.status === 'submitted';
      const isRejected = invoice.status === 'rejected';
      
      return (
        <Card className={cn(
          "border-l-4 shadow-sm transition-shadow hover:shadow-md",
          isRejected ? 'border-l-red-500' : 
          isSubmitted ? 'border-l-blue-500' : 
          'border-l-orange-500'
        )}>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Header con título y badge de estado */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg text-[#2D2D2D] truncate mb-1">
                    {appointment?.listings?.title}
                  </h3>
                  <p className="text-sm text-[#6B6B6B]">
                    Cliente: {appointment?.client_name}
                  </p>
                </div>
                
                {/* Estado badge */}
                {isSubmitted ? (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0">
                    En revisión
                  </Badge>
                ) : isRejected ? (
                  <Badge className="bg-red-100 text-red-800 border-red-200 flex-shrink-0">
                    Rechazada
                  </Badge>
                ) : (
                  <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex-shrink-0">
                    Pendiente
                  </Badge>
                )}
              </div>

              {/* Rechazo reason si aplica */}
              {isRejected && invoice.rejection_reason && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-sm text-red-800">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    {invoice.rejection_reason}
                  </p>
                </div>
              )}

              {/* Metadata: fecha */}
              <div className="flex items-center gap-1.5 text-sm text-[#6B6B6B]">
                <Clock className="w-4 h-4" />
                <span>{formatDate(appointment?.start_time)}</span>
              </div>

              {/* CTA primario */}
              {!isSubmitted && onEdit && (
                <Button
                  onClick={() => onEdit(invoice)}
                  variant={isRejected ? 'destructive' : 'default'}
                  size="default"
                  className="w-full h-11 text-base"
                >
                  {isRejected ? 'Corregir y Reenviar' : 'Completar Desglose'}
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

            {/* Título y cliente */}
            <div>
              <h3 className="font-semibold text-lg text-[#2D2D2D] mb-1">
                {invoice.service_title}
              </h3>
              <p className="text-sm text-[#6B6B6B]">
                Cliente: {invoice.client_name}
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
              Postpago {pendingInvoices.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {pendingInvoices.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pagadas" className="text-sm md:text-base">
              Pagadas
            </TabsTrigger>
          </TabsList>

          {/* Tab Content: Postpago */}
          <TabsContent value="postpago" className="space-y-4">
            {pendingInvoices.length === 0 ? (
              <Card className="border shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#2D2D2D] mb-2">
                    Sin facturas postpago
                  </h3>
                  <p className="text-sm text-[#6B6B6B] max-w-sm">
                    Aparecerán aquí cuando completes un servicio
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingInvoices.map((invoice) => (
                  <InvoiceCard 
                    key={invoice.id} 
                    invoice={invoice} 
                    type="pending" 
                    onEdit={setSelectedInvoice}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab Content: Pagadas */}
          <TabsContent value="pagadas" className="space-y-4">
            {isLoading ? (
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

        {/* Invoicing Modal */}
        <PostPaymentInvoicing
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
          onSuccess={handleInvoiceComplete}
        />
      </PageLayout>
    </>
  );
};

export default ProviderInvoices;