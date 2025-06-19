
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ClientCard from '@/components/clients/ClientCard';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const Clients = () => {
  const { user } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['provider-clients', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          client_id,
          users!appointments_client_id_fkey (
            id,
            name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('provider_id', user.id)
        .not('client_id', 'is', null);
        
      if (error) throw error;
      
      // Remove duplicates and flatten
      const uniqueClients = data.reduce((acc: any[], curr) => {
        if (!acc.find(client => client.id === curr.users?.id)) {
          acc.push(curr.users);
        }
        return acc;
      }, []);
      
      return uniqueClients;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Mis Clientes" subtitle="Cargando clientes...">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Mis Clientes" 
        subtitle="Gestiona la información de tus clientes"
        className="pt-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      </PageContainer>
    </>
  );
};

export default Clients;
