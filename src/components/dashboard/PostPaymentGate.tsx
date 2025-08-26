import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvoices } from '@/hooks/usePostPaymentInvoices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, DollarSign } from 'lucide-react';
import PostPaymentInvoicing from '@/components/provider/PostPaymentInvoicing';

interface PostPaymentGateProps {
  children: React.ReactNode;
}

const PostPaymentGate: React.FC<PostPaymentGateProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  const { data: pendingInvoices = [], refetch } = usePendingInvoices(user?.id);
  
  // If user is not a provider or has no pending invoices, show normal content
  if (user?.role !== 'provider' || pendingInvoices.length === 0) {
    return <>{children}</>;
  }

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

  // Show gating screen with pending invoices
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto border-orange-200 bg-orange-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-orange-800">
            <AlertTriangle className="w-6 h-6" />
            Facturas Pendientes - Post Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-orange-700 bg-orange-100 p-4 rounded-lg">
            <p className="font-medium mb-2">Debes completar las siguientes facturas antes de acceder a otras funciones:</p>
            <p>Para garantizar la transparencia del proceso de cobro, necesitas facturar todos los servicios post-pago completados.</p>
          </div>

          <div className="space-y-3">
            {pendingInvoices.map((invoice) => {
              const appointment = invoice.appointments;
              return (
                <Card key={invoice.id} className="border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">
                          {appointment?.listings?.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Cliente: {appointment?.client_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(appointment?.start_time)}
                        </div>
                        {invoice.status === 'rejected' && (
                          <div className="text-xs text-red-600 mt-2">
                            Rechazada: {invoice.rejection_reason}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => setSelectedInvoice(invoice)}
                        size="sm"
                        variant={invoice.status === 'rejected' ? 'destructive' : 'default'}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {invoice.status === 'rejected' ? 'Corregir' : 'Facturar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center pt-4 border-t border-orange-200">
            <p className="text-sm text-orange-700">
              {pendingInvoices.length} factura{pendingInvoices.length > 1 ? 's' : ''} pendiente{pendingInvoices.length > 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Invoicing Modal */}
      <PostPaymentInvoicing
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onSuccess={handleInvoiceComplete}
      />
    </div>
  );
};

export default PostPaymentGate;