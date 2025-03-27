
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { MOCK_SERVICES } from '@/lib/data';
import { Service } from '@/lib/types';

const Services = () => {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  
  const filteredServices = services.filter(
    service => service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddService = () => {
    setEditingService(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    // In a real app, this would call an API
    setServices(services.filter(s => s.id !== service.id));
    toast.success('Service deleted successfully');
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (editingService) {
      // Update existing service
      setServices(services.map(s => 
        s.id === editingService.id ? { ...s, ...serviceData } : s
      ));
      toast.success('Service updated successfully');
    } else {
      // Add new service
      const newService: Service = {
        id: Date.now().toString(),
        name: serviceData.name || '',
        category: serviceData.category || 'other',
        duration: serviceData.duration || 60,
        price: serviceData.price || 0,
        description: serviceData.description || '',
        createdAt: new Date()
      };
      
      setServices([newService, ...services]);
      toast.success('Service added successfully');
    }
  };

  return (
    <PageContainer 
      title="Services" 
      subtitle="Manage your service offerings"
      action={
        <Button onClick={handleAddService}>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="max-w-md">
          <Input 
            placeholder="Search services..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEditService}
              onDelete={handleDeleteService}
            />
          ))}
          
          {filteredServices.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No services found. Add a new service to get started.</p>
            </div>
          )}
        </div>
        
        <ServiceForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmitService}
          initialData={editingService}
        />
      </div>
    </PageContainer>
  );
};

export default Services;
