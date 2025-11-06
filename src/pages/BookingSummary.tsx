
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import Navbar from '@/components/layout/Navbar';

const BookingSummary = () => {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <PageContainer title="Resumen de Reserva" subtitle="Confirmación de tu cita">
        <div className="space-y-6">
          <Card className="p-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">¡Reserva Confirmada!</h2>
            <p className="text-muted-foreground mb-6">
              Tu cita ha sido reservada exitosamente. Recibirás una confirmación por email.
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => navigate('/client/bookings')}
                className="w-full"
              >
                Ver Mis Reservas
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => navigate('/client/categories')}
                className="w-full"
              >
                Reservar Otro Servicio
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default BookingSummary;
