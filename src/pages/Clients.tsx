
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ClientCard from '@/components/clients/ClientCard';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

interface ClientData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

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
      
      // Remove duplicates and flatten, filtering out invalid entries with proper typing
      const uniqueClients = data.reduce((acc: ClientData[], curr) => {
        if (curr.users && 
            curr.users !== null &&
            typeof curr.users === 'object' && 
            'id' in curr.users && 
            !acc.find(client => client.id === (curr.users as any).id)) {
          acc.push(curr.users as ClientData);
        }
        return acc;
      }, []);
      
      return uniqueClients;
    },
    enabled: !!user?.id,
  });

  const handleEditClient = (client: ClientData) => {
    console.log('Edit client:', client);
  };

  const handleDeleteClient = (client: ClientData) => {
    console.log('Delete client:', client);
  };

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
            <ClientCard 
              key={client.id} 
              client={client} 
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          ))}
        </div>
      </PageContainer>
    </>
  );
};

export default Clients;
