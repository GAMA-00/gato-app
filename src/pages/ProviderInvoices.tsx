import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, FileText } from 'lucide-react';
import PostPaymentInvoicing from '@/components/provider/PostPaymentInvoicing';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';
import { formatCurrency } from '@/utils/currencyUtils';
import { CompletedServicesSection } from '@/components/invoices/CompletedServicesSection';

const ProviderInvoices: React.FC = () => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const { data: pendingInvoices = [], refetch, isLoading } = usePendingInvoices(user?.id);

  const handleInvoiceComplete = () => {
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
      case 'draft':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Borrador</span>;
      case 'submitted':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Enviada</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Aprobada</span>;
      case 'rejected':
        return (
          <div className="space-y-1">
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Rechazada</span>
            {rejectionReason && (
              <p className="text-xs text-red-600 italic">{rejectionReason}</p>
            )}
          </div>
        );
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Facturas" 
        subtitle="Gestiona el desglose de gastos post-pago"
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
          ) : pendingInvoices.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay facturas pendientes
                </h3>
                <p className="text-sm text-muted-foreground">
                  Todas las facturas post-pago han sido completadas.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {pendingInvoices.map((invoice) => {
                const appointment = invoice.appointments;
                return (
                  <Card key={invoice.id} className="border-l-4 border-l-primary">
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
                              <Button
                                onClick={() => setSelectedInvoice(invoice)}
                                variant={invoice.status === 'rejected' ? 'destructive' : 'default'}
                                size="sm"
                                className="ml-2"
                              >
                                <DollarSign className="w-4 h-4 mr-2" />
                                {invoice.status === 'rejected' ? 'Corregir' : 'Gestionar'}
                              </Button>
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

        {/* Completed Services Section */}
        <CompletedServicesSection userType="provider" />

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