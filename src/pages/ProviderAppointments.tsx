import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageLayout from '@/components/layout/PageLayout';
import AppointmentQueue from '@/components/dashboard/AppointmentQueue';
import { useProviderQueue, useProviderHistory } from '@/hooks/useProviderQueue';

const ProviderAppointments = () => {
  const navigate = useNavigate();
  const { data: queue = [], isLoading: loadingQueue } = useProviderQueue();
  const { data: history = [], isLoading: loadingHistory } = useProviderHistory();

  return (
    <PageLayout>
      <div className="mx-auto max-w-2xl px-4 py-6 space-y-4 pb-24">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Inicio
        </button>

        <h1 className="text-2xl font-bold">Mis Citas</h1>

        <Tabs defaultValue="activas" className="w-full">
          <TabsList className="w-full bg-muted/60 p-1 rounded-full h-auto">
            <TabsTrigger
              value="activas"
              className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 gap-2"
            >
              Activas
              {queue.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full bg-background/80 text-foreground">
                  {queue.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="pasadas"
              className="flex-1 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 px-4 gap-2"
            >
              Citas pasadas
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs rounded-full bg-background/80 text-foreground">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="activas" className="mt-4">
            {loadingQueue ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <AppointmentQueue appointments={queue} emptyMessage="No tenés citas activas." />
            )}
          </TabsContent>

          <TabsContent value="pasadas" className="mt-4">
            {loadingHistory ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <AppointmentQueue appointments={history} emptyMessage="Aún no tenés citas completadas." />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default ProviderAppointments;
