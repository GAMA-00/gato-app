
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Clock, DollarSign, Calendar } from 'lucide-react';
import { MOCK_SERVICES } from '@/lib/data';
import { Service, Building } from '@/lib/types';

// Mock buildings data with descriptive names
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Colinas de Montealegre', address: 'Tres Ríos, Cartago' },
  { id: '2', name: 'Gregal', address: 'Tres Ríos, Cartago' },
  { id: '3', name: 'El Herrán', address: 'Tres Ríos, Cartago' }
];

const ClientServices = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [services] = useState<Service[]>(MOCK_SERVICES);
  const navigate = useNavigate();
  
  useEffect(() => {
    const selectedBuilding = MOCK_BUILDINGS.find(b => b.id === buildingId) || null;
    setBuilding(selectedBuilding);
  }, [buildingId]);

  const handleBookService = (serviceId: string) => {
    navigate(`/client/book/${buildingId}/${serviceId}`);
  };

  if (!building) {
    return (
      <PageContainer title="Cargando...">
        <div>Buscando información de la residencia...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={building.name}
      subtitle={`Servicios disponibles en ${building.address}`}
      action={
        <Button variant="outline" onClick={() => navigate('/client')}>
          Cambiar Residencia
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{service.duration} minutos</span>
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
                  Reservar Cita
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {services.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No hay servicios disponibles en esta residencia todavía.</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientServices;
