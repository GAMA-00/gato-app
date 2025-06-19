
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

const ClientBooking = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <PageContainer title="Reservar Cita" subtitle="Selecciona fecha y hora">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Sistema de reservas en desarrollo para el servicio: {serviceId}
            </p>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientBooking;
