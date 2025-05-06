
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ServiceVariant } from '@/components/client/service/types';
import RecommendedTimeSlots from '@/components/client/booking/RecommendedTimeSlots';
import BookingSummaryCard from '@/components/client/booking/BookingSummaryCard';
import { Service } from '@/lib/types';
import { MOCK_APPOINTMENTS } from '@/lib/data';

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  isRecommended: boolean;
}

const ClientBooking = () => {
  const { providerId, serviceId } = useParams<{ providerId: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData || {};
  const { user } = useAuth();
  
  const [service, setService] = useState<Service | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);
  const [commissionRate, setCommissionRate] = useState(20); // Default commission rate
  const [selectedVariants, setSelectedVariants] = useState<ServiceVariant[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]); // This would normally be loaded from the database

  useEffect(() => {
    console.log("ClientBooking rendered with params:", { providerId, serviceId });
    console.log("Booking data from state:", bookingData);
    
    // Get selected variants from location state
    if (bookingData?.selectedVariants) {
      setSelectedVariants(bookingData.selectedVariants);
    }
    
    // Load service details
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
    
    // Load appointments from localStorage or mock data
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
        setAppointments(MOCK_APPOINTMENTS);
      }
    } else {
      setAppointments(MOCK_APPOINTMENTS);
    }
    
    // Load commission rate from localStorage
    const savedSettings = localStorage.getItem('gato_system_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setCommissionRate(parsedSettings.commissionRate || 20);
      } catch (error) {
        console.error('Error parsing system settings:', error);
      }
    }
  }, [serviceId, bookingData, providerId]);

  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSelectTimeSlot = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
  };

  const handleBookAppointment = () => {
    if (!user || !service || !selectedTimeSlot) {
      toast.error("Por favor selecciona una fecha y hora para continuar");
      return;
    }

    const endTime = selectedTimeSlot.endTime;
    
    // Create new appointment request
    const newAppointment = {
      id: Date.now().toString(),
      serviceId: service.id,
      clientId: user.id,
      providerId: service.providerId || providerId,
      startTime: selectedTimeSlot.startTime,
      endTime: endTime,
      status: 'pending', // Set as "pending" for provider confirmation
      recurrence: 'none',
      notes: '',
      createdAt: new Date(),
      building: 'Colinas de Montealegre',
      apartment: '703',
      serviceName: service.name,
      clientName: user.name
    };

    // In a real implementation, we would save to the database
    // For now, we'll just add to local storage
    const updatedAppointments = [...appointments, newAppointment];
    localStorage.setItem('gato_appointments', JSON.stringify(updatedAppointments));
    
    // Navigate to confirmation page
    navigate('/client/booking-confirmation', {
      state: {
        bookingData: {
          service,
          provider: {
            id: service.providerId || providerId,
            name: service.providerName || 'Proveedor de servicio'
          },
          selectedVariants: selectedVariants.length > 0 ? selectedVariants : null,
          selectedTimeSlot
        }
      }
    });
  };

  if (!service) {
    return (
      <PageContainer title="Reserva de Servicio" subtitle="Servicio no encontrado">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="mb-4 flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
        <div className="text-center py-8">
          <p className="text-muted-foreground">El servicio seleccionado no existe.</p>
        </div>
      </PageContainer>
    );
  }

  // Filter provider's appointments only
  const providerAppointments = appointments.filter(
    app => app.providerId === service.providerId || app.providerId === providerId
  );
  
  return (
    <PageContainer
      title="Reserva de Servicio" 
      subtitle={service.name}
      action={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        {/* Left Column: Time slot selection */}
        <div className="md:col-span-2">
          <RecommendedTimeSlots
            serviceDuration={
              selectedVariants.reduce((sum, v) => sum + Number(v.duration || 0), 0) || 
              service.duration || 60
            }
            onSelectTimeSlot={handleSelectTimeSlot}
            selectedTimeSlot={selectedTimeSlot}
            providerAppointments={providerAppointments}
          />
        </div>
        
        {/* Right Column: Booking summary */}
        <div>
          <BookingSummaryCard
            selectedVariants={selectedVariants}
            selectedTimeSlot={selectedTimeSlot}
            providerId={providerId || service.providerId}
            serviceId={serviceId || service.id}
            onSchedule={handleBookAppointment}
            basePrice={service.price}
            commissionRate={commissionRate}
          />
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBooking;
