
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

// Updated mock buildings data
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Colinas de Montealegre', address: '123 Blvd. Montealegre' },
  { id: '2', name: 'Gregal', address: '456 Calle Gregal' },
  { id: '3', name: 'El Herran', address: '789 Carretera El Herran' }
];

const ClientHome = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedBuilding) {
      navigate(`/client/services/${selectedBuilding}`);
    }
  };

  return (
    <PageContainer 
      title="Bienvenido" 
      subtitle="Seleccione su residencia"
    >
      <div className="max-w-md mx-auto mt-8 space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-medium">Seleccione su residencia</label>
          <Select onValueChange={setSelectedBuilding} value={selectedBuilding}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Elija una residencia" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_BUILDINGS.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
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
      </div>
    </PageContainer>
  );
};

export default ClientHome;
