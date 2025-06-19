
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ClientCard from '@/components/clients/ClientCard';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';
import { Client } from '@/lib/types';

interface ClientData {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

interface ValidClientUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
}

interface ValidAppointmentData {
  client_id: string;
  users: ValidClientUser;
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
      
      // Filter and validate data with proper typing
      const validData = (data || []).filter((curr): curr is ValidAppointmentData => {
        return curr && 
               curr.users && 
               curr.users !== null &&
               curr.users !== undefined &&
               typeof curr.users === 'object' && 
               'id' in curr.users;
      });
      
      // Remove duplicates and flatten
      const uniqueClients = validData.reduce((acc: ClientData[], curr) => {
        if (!acc.find(client => client.id === curr.users.id)) {
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
          {clients.map((client) => {
            // Transform ClientData to Client for the component
            const transformedClient: Client = {
              id: client.id,
              name: client.name || '',
              email: client.email || '',
              phone: client.phone || '',
              address: '', // Default value since not available
              notes: '', // Default value since not available
              createdAt: new Date(), // Default value since not available
              isRecurring: false, // Default value since not available
              preferredProviders: [], // Default value since not available
              totalBookings: 0 // Default value since not available
            };
            
            return (
              <ClientCard 
                key={client.id} 
                client={transformedClient} 
                onEdit={handleEditClient}
                onDelete={handleDeleteClient}
              />
            );
          })}
        </div>
      </PageContainer>
    </>
  );
};

export default Clients;
