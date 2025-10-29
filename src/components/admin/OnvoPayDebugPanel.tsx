import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, Activity, AlertTriangle, CheckCircle, RefreshCw, Clock, XCircle } from 'lucide-react';

interface HealthCheckResult {
  status: string;
  environment: string;
  checks: Array<{
    name: string;
    status: string;
    details: any;
  }>;
  diagnostics: any;
  recommendations: any;
}

interface TransactionLookupResult {
  localPayment: any;
  onvoPayment: any;
  comparison: any;
  recommendations: string[];
  environment: string;
}

interface RecurringPaymentStatus {
  appointment_id: string;
  appointment_recurrence: string;
  appointment_status: string;
  payment_id: string;
  payment_type: string;
  payment_status: string;
  amount: number;
  created_at: string;
  authorized_at: string | null;
  captured_at: string | null;
  client_name: string;
  service_title: string;
}

export const OnvoPayDebugPanel = () => {
  const queryClient = useQueryClient();
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [transactionData, setTransactionData] = useState<TransactionLookupResult | null>(null);
  const [reconciliationData, setReconciliationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState('');

  // Fetch recurring payments status
  const { data: recurringPayments, isLoading: isLoadingRecurring, refetch: refetchRecurring } = useQuery({
    queryKey: ['recurring-payments-debug'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recurring_payments_status');
      if (error) throw error;
      return data as RecurringPaymentStatus[];
    }
  });

  // Process pending recurring payment
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase.functions.invoke('onvopay-capture', {
        body: { paymentId }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pago procesado exitosamente",
      });
      refetchRecurring();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onvopay-health-check');
      if (error) throw error;
      setHealthData(data);
      toast({
        title: "Health Check Completed",
        description: `Status: ${data.status}`,
      });
    } catch (error: any) {
      console.error('Health check failed:', error);
      toast({
        variant: "destructive",
        title: "Health Check Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const lookupTransaction = async () => {
    if (!paymentIntentId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a Payment Intent ID",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onvopay-transaction-lookup', {
        body: { payment_intent_id: paymentIntentId }
      });
      if (error) throw error;
      setTransactionData(data);
      toast({
        title: "Transaction Lookup Completed",
        description: `Found: ${data.onvoPayment ? 'Yes' : 'No'}`,
      });
    } catch (error: any) {
      console.error('Transaction lookup failed:', error);
      toast({
        variant: "destructive",
        title: "Lookup Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('onvopay-transaction-lookup', {
        body: { action: 'reconcile', limit: 20 }
      });
      if (error) throw error;
      setReconciliationData(data);
      toast({
        title: "Reconciliation Completed",
        description: `Checked ${data.summary.totalChecked} transactions`,
      });
    } catch (error: any) {
      console.error('Reconciliation failed:', error);
      toast({
        variant: "destructive",
        title: "Reconciliation Failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'pass' || status === 'healthy' ? 'default' : 
                   status === 'fail' || status === 'unhealthy' ? 'destructive' : 
                   'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'captured':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'authorized':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'pending_authorization':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'captured':
        return 'bg-green-100 text-green-800';
      case 'authorized':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending_authorization':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  const pendingPayments = recurringPayments?.filter(
    p => p.payment_status !== 'captured' && p.appointment_status === 'completed'
  ) || [];

  const capturedPayments = recurringPayments?.filter(
    p => p.payment_status === 'captured'
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5" />
        <h2 className="text-2xl font-bold">OnvoPay Debug Panel</h2>
      </div>

      <Tabs defaultValue="recurring" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recurring">Recurring Payments</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
          <TabsTrigger value="lookup">Transaction Lookup</TabsTrigger>
          <TabsTrigger value="reconcile">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pagos Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {pendingPayments.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Citas completadas sin cobro
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pagos Capturados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {capturedPayments.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Procesados correctamente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Recurrentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {recurringPayments?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas las citas recurrentes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Payments Alert */}
          {pendingPayments.length > 0 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                Hay {pendingPayments.length} pagos recurrentes pendientes de captura para citas completadas.
                Estos pagos deberían haberse procesado automáticamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Pending Payments Table */}
          {pendingPayments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Pagos Pendientes de Captura
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => refetchRecurring()}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingRecurring ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{payment.client_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {payment.appointment_recurrence}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.service_title}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Cita: {payment.appointment_status}</span>
                          <span>Monto: ${payment.amount}</span>
                          <span>
                            Creado: {new Date(payment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getPaymentStatusIcon(payment.payment_status)}
                          <Badge className={getPaymentStatusColor(payment.payment_status)}>
                            {payment.payment_status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => processPaymentMutation.mutate(payment.payment_id)}
                          disabled={processPaymentMutation.isPending}
                        >
                          {processPaymentMutation.isPending ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            'Capturar Ahora'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Captured Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Pagos Capturados ({capturedPayments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capturedPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay pagos capturados todavía
                </p>
              ) : (
                <div className="space-y-2">
                  {capturedPayments.slice(0, 10).map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{payment.client_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {payment.appointment_recurrence}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.service_title} • ${payment.amount}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPaymentStatusIcon(payment.payment_status)}
                        <Badge className={getPaymentStatusColor(payment.payment_status)}>
                          {payment.payment_status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Check</CardTitle>
              <CardDescription>
                Verify OnvoPay integration configuration and connectivity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runHealthCheck} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                Run Health Check
              </Button>

              {healthData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(healthData.status)}
                    <span className="font-semibold">Overall Status:</span>
                    {getStatusBadge(healthData.status)}
                    <Badge variant="outline">{healthData.environment}</Badge>
                  </div>

                  <div className="grid gap-4">
                    {healthData.checks.map((check, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{check.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(check.status)}
                              {getStatusBadge(check.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {healthData.recommendations && (
                    <div className="space-y-3">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <strong>Webhook Configuration:</strong>
                            <div className="text-sm font-mono bg-muted p-2 rounded break-all">
                              {healthData.recommendations.webhookConfiguration.url}
                            </div>
                            <p className="text-sm">
                              Configure this URL in your OnvoPay dashboard for events: {healthData.recommendations.webhookConfiguration.events.join(', ')}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                      
                      <Alert>
                        <AlertDescription>
                          <div className="space-y-1 text-sm">
                            <div><strong>Environment:</strong> {healthData.recommendations.environmentCheck}</div>
                            <div><strong>Secret Key:</strong> {healthData.recommendations.secretKeyConfig}</div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lookup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Lookup</CardTitle>
              <CardDescription>
                Look up a specific transaction in both local database and OnvoPay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="paymentIntentId">Payment Intent ID</Label>
                  <Input
                    id="paymentIntentId"
                    placeholder="cmg5dm1ejwtihk02dcpl0ywtb"
                    value={paymentIntentId}
                    onChange={(e) => setPaymentIntentId(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={lookupTransaction} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                    Lookup
                  </Button>
                </div>
              </div>

              {transactionData && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{transactionData.environment}</Badge>
                    {transactionData.onvoPayment ? (
                      <Badge variant="default">Found in OnvoPay</Badge>
                    ) : (
                      <Badge variant="destructive">Not Found in OnvoPay</Badge>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Local Database</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                          {JSON.stringify(transactionData.localPayment, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">OnvoPay API</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
                          {JSON.stringify(transactionData.onvoPayment, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>

                  {transactionData.comparison && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Comparison</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Status Match: {transactionData.comparison.statusMatch ? '✅' : '❌'}</div>
                          <div>Amount Match: {transactionData.comparison.amountMatch ? '✅' : '❌'}</div>
                          <div>Local Status: {transactionData.comparison.localStatus}</div>
                          <div>OnvoPay Status: {transactionData.comparison.onvoStatus}</div>
                          <div>Local Amount: ${transactionData.comparison.localAmount / 100}</div>
                          <div>OnvoPay Amount: ${transactionData.comparison.onvoAmount / 100}</div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {transactionData.recommendations && transactionData.recommendations.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Recommendations:</strong>
                          {transactionData.recommendations.map((rec, index) => (
                            <div key={index} className="text-sm">• {rec}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconcile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Reconciliation</CardTitle>
              <CardDescription>
                Compare recent local transactions with OnvoPay records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={runReconciliation} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
                Run Reconciliation (Last 20)
              </Button>

              {reconciliationData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{reconciliationData.summary.totalChecked}</div>
                        <p className="text-xs text-muted-foreground">Total Checked</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{reconciliationData.summary.foundInOnvoPay}</div>
                        <p className="text-xs text-muted-foreground">Found in OnvoPay</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{reconciliationData.summary.notFoundInOnvoPay}</div>
                        <p className="text-xs text-muted-foreground">Not Found</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-yellow-600">{reconciliationData.summary.statusMismatches}</div>
                        <p className="text-xs text-muted-foreground">Status Mismatches</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-auto">
                    {reconciliationData.reconciliation.map((item: any, index: number) => (
                      <Card key={index} className={!item.match.exists ? 'border-red-200' : item.match.statusMatch ? 'border-green-200' : 'border-yellow-200'}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-mono">{item.localPayment.onvopay_payment_id}</div>
                            <div className="flex gap-2">
                              {item.match.exists ? (
                                <Badge variant="default">Found</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                              {item.match.exists && (
                                <>
                                  <Badge variant={item.match.statusMatch ? "default" : "destructive"}>
                                    Status: {item.match.statusMatch ? 'Match' : 'Mismatch'}
                                  </Badge>
                                  <Badge variant={item.match.amountMatch ? "default" : "destructive"}>
                                    Amount: {item.match.amountMatch ? 'Match' : 'Mismatch'}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                          {item.error && (
                            <div className="text-xs text-red-600 mt-2">Error: {item.error}</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};