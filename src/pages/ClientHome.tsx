
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { Building } from '@/lib/types';

// Mock buildings data
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Torres del Atardecer', address: '123 Blvd. Atardecer' },
  { id: '2', name: 'Apartamentos Vista al Mar', address: '456 Calle del Océano' },
  { id: '3', name: 'Alturas de la Montaña', address: '789 Carretera Montaña' },
  { id: '4', name: 'Residencias Centro de la Ciudad', address: '101 Calle Principal' },
  { id: '5', name: 'Condominios Parque', address: '202 Avenida del Parque' }
];

const ClientHome = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedBuilding === 'provider') {
      navigate('/'); // Navigate to provider dashboard
    } else if (selectedBuilding) {
      navigate(`/client/services/${selectedBuilding}`);
    }
  };

  return (
    <PageContainer 
      title="Bienvenido" 
      subtitle="Selecciona tu edificio para ver los servicios disponibles"
    >
      <div className="max-w-md mx-auto mt-8 space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-medium">Selecciona tu edificio</label>
          <Select onValueChange={setSelectedBuilding} value={selectedBuilding}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elige un edificio" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_BUILDINGS.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
              <SelectItem value="provider">Soy un proveedor de servicios</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={handleContinue}
            disabled={!selectedBuilding} 
            className="w-full mt-6"
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 border rounded-lg bg-muted/30">
          <h3 className="font-medium mb-2">Acerca de Gato</h3>
          <p className="text-sm text-muted-foreground">
            Servicios confiables, sin salir de casa.
            Gato conecta a residentes con profesionales que ya trabajan en tu edificio de manera recurrente. Rápido, seguro y fácil de agendar.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientHome;
