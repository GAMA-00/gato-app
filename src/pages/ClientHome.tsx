
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
  { id: '1', name: 'Sunset Towers', address: '123 Sunset Blvd' },
  { id: '2', name: 'Ocean View Apartments', address: '456 Ocean Dr' },
  { id: '3', name: 'Mountain Heights', address: '789 Mountain Rd' },
  { id: '4', name: 'City Center Residences', address: '101 Main St' },
  { id: '5', name: 'Parkside Condos', address: '202 Park Ave' }
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
      title="Welcome" 
      subtitle="Select your building to see available services"
    >
      <div className="max-w-md mx-auto mt-8 space-y-8">
        <div className="space-y-4">
          <label className="text-sm font-medium">Select your building</label>
          <Select onValueChange={setSelectedBuilding} value={selectedBuilding}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a building" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_BUILDINGS.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
              <SelectItem value="provider">I am a service provider</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            onClick={handleContinue}
            disabled={!selectedBuilding} 
            className="w-full mt-6"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 border rounded-lg bg-muted/30">
          <h3 className="font-medium mb-2">About ServiceSync</h3>
          <p className="text-sm text-muted-foreground">
            ServiceSync connects you with trusted service providers in your building.
            Book cleaning, pet grooming, car washing services, and more with just a few clicks.
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientHome;
