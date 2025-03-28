
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, DollarSign, Calendar } from 'lucide-react';
import { MOCK_SERVICES } from '@/lib/data';
import { Service, Building } from '@/lib/types';

// Mock buildings data
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Sunset Towers', address: '123 Sunset Blvd' },
  { id: '2', name: 'Ocean View Apartments', address: '456 Ocean Dr' },
  { id: '3', name: 'Mountain Heights', address: '789 Mountain Rd' },
  { id: '4', name: 'City Center Residences', address: '101 Main St' },
  { id: '5', name: 'Parkside Condos', address: '202 Park Ave' }
];

const ClientServices = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const navigate = useNavigate();
  
  useEffect(() => {
    // In a real app, we would fetch the building data from an API
    const selectedBuilding = MOCK_BUILDINGS.find(b => b.id === buildingId) || null;
    setBuilding(selectedBuilding);
  }, [buildingId]);

  const handleBookService = (serviceId: string) => {
    navigate(`/client/book/${buildingId}/${serviceId}`);
  };

  if (!building) {
    return (
      <PageContainer title="Loading...">
        <div>Loading building information...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={`Services at ${building.name}`}
      subtitle={building.address}
      action={
        <Button variant="outline" onClick={() => navigate('/client')}>
          Change Building
        </Button>
      }
    >
      <div className="space-y-6">
        <h2 className="text-xl font-medium">Available Services</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>${service.price.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="bg-muted/20 px-6 py-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleBookService(service.id)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Appointment
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {services.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No services available at this building yet.</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientServices;
