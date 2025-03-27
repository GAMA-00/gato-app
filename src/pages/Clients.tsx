
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import ClientCard from '@/components/clients/ClientCard';
import ClientForm from '@/components/clients/ClientForm';
import { MOCK_CLIENTS } from '@/lib/data';
import { Client } from '@/lib/types';

const Clients = () => {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  
  const filteredClients = clients.filter(
    client => client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
              client.phone.includes(searchTerm)
  );
  
  const handleAddClient = () => {
    setEditingClient(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };
  
  const handleDeleteClient = (client: Client) => {
    // In a real app, this would call an API
    setClients(clients.filter(c => c.id !== client.id));
    toast.success('Client deleted successfully');
  };
  
  const handleSubmitClient = (clientData: Partial<Client>) => {
    if (editingClient) {
      // Update existing client
      setClients(clients.map(c => 
        c.id === editingClient.id ? { ...c, ...clientData } : c
      ));
      toast.success('Client updated successfully');
    } else {
      // Add new client
      const newClient: Client = {
        id: Date.now().toString(),
        name: clientData.name || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        notes: clientData.notes || '',
        createdAt: new Date()
      };
      
      setClients([newClient, ...clients]);
      toast.success('Client added successfully');
    }
  };

  return (
    <PageContainer 
      title="Clients" 
      subtitle="Manage your client database"
      action={
        <Button onClick={handleAddClient}>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="max-w-md">
          <Input 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
            />
          ))}
          
          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No clients found. Add a new client to get started.</p>
            </div>
          )}
        </div>
        
        <ClientForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmitClient}
          initialData={editingClient}
        />
      </div>
    </PageContainer>
  );
};

export default Clients;
