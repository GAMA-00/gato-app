
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Service } from '@/lib/types';

const ClientBooking = () => {
  const { buildingId, serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [commissionRate, setCommissionRate] = useState(20); // Default commission rate

  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        const selectedService = parsedServices.find((s: Service) => s.id === serviceId);
        setService(selectedService || null);
      } catch (error) {
        console.error('Error parsing services:', error);
        setService(null);
      }
    }
    
    // Load appointments from localStorage
    const savedAppointments = localStorage.getItem('gato_appointments');
    if (savedAppointments) {
      try {
        const parsedAppointments = JSON.parse(savedAppointments, (key, value) => {
          if (key === 'startTime' || key === 'endTime' || key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        setAppointments(parsedAppointments);
      } catch (error) {
        console.error('Error parsing appointments:', error);
        setAppointments([]);
      }
    }
    
    // Load commission rate from localStorage (in a real app this would come from Supabase)
    const savedSettings = localStorage.getItem('gato_system_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setCommissionRate(parsedSettings.commissionRate || 20);
      } catch (error) {
        console.error('Error parsing system settings:', error);
      }
    }
  }, [serviceId]);

  const handleDateChange = (date: Date) => {
    setStartTime(date);
  };
  
  // Calculate final price with commission
  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * (1 + (commissionRate / 100));
  };

  const handleBookAppointment = () => {
    if (!user || !service) return;

    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    const newAppointment = {
      id: Date.now().toString(),
      serviceId: service.id,
      clientId: user.id,
      providerId: service.providerId,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
      recurrence: 'none',
      notes: '',
      createdAt: new Date(),
      building: 'Colinas de Montealegre',
      apartment: '703',
      serviceName: service.name,
      clientName: user.name
    };

    const updatedAppointments = [...appointments, newAppointment];
    localStorage.setItem('gato_appointments', JSON.stringify(updatedAppointments));
    setAppointments(updatedAppointments);

    navigate('/client/bookings');
  };

  if (!service) {
    return (
      <PageContainer title="Reserva de Servicio" subtitle="Servicio no encontrado">
        <div className="text-center py-8">
          <p className="text-muted-foreground">El servicio seleccionado no existe.</p>
        </div>
      </PageContainer>
    );
  }

  const finalPrice = calculateFinalPrice(service.price);

  return (
    <PageContainer title="Reserva de Servicio" subtitle={service.name}>
      <Card className="max-w-md mx-auto">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-4">Confirmar Reserva</h2>
          <div className="mb-4">
            <p>Servicio: {service.name}</p>
            <p>Descripción: {service.description}</p>
            <p>Duración: {service.duration} minutos</p>
            <p>Precio: ${finalPrice.toFixed(2)}</p>
          </div>
          <div className="mb-4">
            <p className="font-semibold">Seleccionar Fecha y Hora:</p>
            <input
              type="datetime-local"
              value={format(startTime, "yyyy-MM-dd'T'HH:mm")}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
              className="w-full rounded-md border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <Button className="w-full" onClick={handleBookAppointment}>
            Reservar
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default ClientBooking;
