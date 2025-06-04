
import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProvidersList from '@/components/client/results/ProvidersList';

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  
  console.log("ClientResultsView rendered with params:", { categoryName, serviceId });
  
  const handleBack = () => {
    navigate(`/client/category/${categoryName}`);
  };
  
  return (
    <PageContainer
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-6xl mx-auto">
        <ProvidersList 
          categoryName={categoryName || ''}
          serviceId={serviceId || ''}
        />
      </div>
    </PageContainer>
  );
};

export default ClientResultsView;
