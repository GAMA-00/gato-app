import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, DollarSign, FileText } from 'lucide-react';
import PostPaymentReview from '@/components/client/PostPaymentReview';

interface ClientPostPaymentGateProps {
  children: React.ReactNode;
}

const ClientPostPaymentGate: React.FC<ClientPostPaymentGateProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const { data: pendingInvoices = [], refetch } = useClientInvoices(user?.id);
  
  // If user is not a client or has no pending invoices, show normal content
  if (user?.role !== 'client' || pendingInvoices.length === 0) {
    return <>{children}</>;
  }

  const handleInvoiceProcessed = () => {
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

  // Show gating screen with pending invoices for approval
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-800">
            <FileText className="w-6 h-6" />
            Facturas por Aprobar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-blue-700 bg-blue-100 p-4 rounded-lg">
            <p className="font-medium mb-2">Tienes facturas de servicios post-pago esperando tu aprobación:</p>
            <p>Revisa los detalles y aprueba o rechaza cada factura para continuar.</p>
          </div>

          <div className="space-y-3">
            {pendingInvoices.map((invoice) => {
              const appointment = invoice.appointments;
              return (
                <Card key={invoice.id} className="border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {appointment?.listings?.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Proveedor: {appointment?.provider_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(appointment?.start_time)}
                        </div>
                        <div className="text-sm font-semibold text-blue-700">
                          Total: ₡{invoice.total_price?.toLocaleString()}
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => setSelectedInvoice(invoice)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Revisar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center pt-4 border-t border-blue-200">
            <p className="text-sm text-blue-700">
              {pendingInvoices.length} factura{pendingInvoices.length > 1 ? 's' : ''} por revisar
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Review Modal */}
      <PostPaymentReview
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onSuccess={handleInvoiceProcessed}
      />
    </div>
  );
};

export default ClientPostPaymentGate;