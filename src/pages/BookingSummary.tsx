import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from "@/hooks/use-toast";
import PageContainer from '@/components/layout/PageContainer';
import { ArrowLeft, Calendar, Clock, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DateTimeSelector from '@/components/client/booking/DateTimeSelector';
import RecurrenceSelector from '@/components/client/booking/RecurrenceSelector';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRecurringBooking } from '@/hooks/useRecurringBooking';

const BookingSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { createRecurringBooking, isCreating } = useRecurringBooking();
  
  // All state hooks at the top
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('once');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | undefined>(undefined);
  
  // Fetch service info for booking data
  const { data: serviceInfo } = useQuery({
    queryKey: ['service-info', bookingData?.serviceId],
    queryFn: async () => {
      if (!bookingData?.serviceId) return null;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*, category:category_id(name, label)')
        .eq('id', bookingData.serviceId)
        .single();
        
      if (error) {
        console.error("Error fetching service info:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!bookingData?.serviceId
  });
  
  // Normalize recurrence value to match database constraints
  const normalizeRecurrenceValue = (value) => {
    const recurrenceMap = {
      'once': null,
      'weekly': 'weekly',
      'biweekly': 'biweekly',
      'monthly': 'monthly',
      'daily': 'daily'
    };
    
    return recurrenceMap[value] || null;
  };
  
  // Mutation to create appointment or recurring appointments
  const createAppointmentMutation = useMutation({
    mutationFn: async () => {
      // Check authentication
      if (!user?.id) {
        throw new Error("Debes iniciar sesión para reservar un servicio");
      }
      
      // Ensure we have date and time selected
      if (!selectedDate || !selectedTime) {
        throw new Error("Debes seleccionar una fecha y hora para el servicio");
      }
      
      // Parse selected time and calculate start/end times
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);
      
      const durationMinutes = bookingData.duration || 60;
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      // Normalize the recurrence value
      const normalizedRecurrence = normalizeRecurrenceValue(selectedFrequency);
      
      // Check if we have a valid residencia_id
      const residencia_id = user.residenciaId || null;
      
      // If it's a recurring appointment, use the recurring booking hook
      if (selectedFrequency !== 'once') {
        createRecurringBooking({
          providerId: bookingData.providerId,
          clientId: user.id,
          listingId: bookingData.serviceId,
          residenciaId: residencia_id || '',
          startTime: startTime,
          duration: durationMinutes,
          recurrence: selectedFrequency as 'weekly' | 'biweekly' | 'monthly',
          selectedDays: [], // No longer needed - automatically determined by selected date
          notes: bookingData.notes || '',
          apartment: user.apartment || ''
        });
        return;
      }
      
      // For single appointments, continue with the regular flow
      if (!residencia_id) {
        console.warn("Creating appointment without residencia_id. User profile may need updating.");
        
        // Try to fetch residencia_id from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('residencia_id')
          .eq('id', user.id)
          .eq('role', 'client')
          .single();
          
        if (!userError && userData?.residencia_id) {
          console.log('Found residencia_id in users table:', userData.residencia_id);
          
          // Create appointment with this residencia_id
          const { data, error } = await supabase
            .from('appointments')
            .insert({
              client_id: user.id,
              provider_id: bookingData.providerId,
              listing_id: bookingData.serviceId,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: 'pending',
              residencia_id: userData.residencia_id,
              apartment: user.apartment || '',
              notes: bookingData.notes || '',
              recurrence: normalizedRecurrence
            })
            .select();
            
          if (error) throw error;
          return data;
        } else {
          console.error("No residencia_id found for user. Redirecting to profile update.");
          toast({
            title: "Información incompleta",
            description: "Por favor actualiza tu perfil con tu información de residencia antes de reservar.",
            variant: "destructive"
          });
          throw new Error("Por favor actualiza tu perfil con tu información de residencia antes de reservar.");
        }
      }
      
      console.log("Creating appointment with data:", {
        client_id: user.id,
        provider_id: bookingData.providerId,
        listing_id: bookingData.serviceId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        residencia_id: residencia_id,
        apartment: user.apartment || '',
        notes: bookingData.notes || '',
        recurrence: normalizedRecurrence
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: user.id,
          provider_id: bookingData.providerId,
          listing_id: bookingData.serviceId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'pending',
          residencia_id: residencia_id,
          apartment: user.apartment || '',
          notes: bookingData.notes || '',
          recurrence: normalizedRecurrence
        })
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast({
        title: "Éxito",
        description: "Reserva solicitada con éxito"
      });
      navigate('/client/bookings');
    },
    onError: (error: any) => {
      console.error("Error creating appointment:", error);
      
      if (error.message.includes('recurrence_check')) {
        toast({
          title: "Error",
          description: "Error: El tipo de recurrencia seleccionado no es válido.",
          variant: "destructive"
        });
      } else if (error.message.includes('foreign key')) {
        toast({
          title: "Error",
          description: "Error: Hay un problema con tu perfil de usuario. Por favor contacta a soporte.",
          variant: "destructive"
        });
      } else if (error.message.includes('residencia_id')) {
        toast({
          title: "Error", 
          description: "No se pudo identificar tu residencia. Por favor actualiza tu perfil.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: `Error al crear la reserva: ${error.message}`,
          variant: "destructive"
        });
      }
      
      setIsSubmitting(false);
    }
  });

  // Get booking data from multiple sources
  useEffect(() => {
    console.log("BookingSummary: Initializing booking data");
    
    // Priority 1: Data from navigation state
    if (location.state?.bookingData) {
      console.log("Found booking data in location state:", location.state.bookingData);
      setBookingData(location.state.bookingData);
      return;
    }
    
    // Priority 2: Data from URL parameters (for direct access)
    const serviceId = searchParams.get('serviceId');
    const providerId = searchParams.get('providerId');
    
    if (serviceId && providerId) {
      console.log("Found URL parameters, fetching booking data:", { serviceId, providerId });
      fetchBookingDataFromParams(serviceId, providerId);
    } else {
      console.error("No booking data found in state or URL parameters");
      toast({
        title: "Error",
        description: "Información de reserva no encontrada",
        variant: "destructive"
      });
      navigate('/client');
    }
  }, [location.state, searchParams]);
  
  // Fetch booking data from URL parameters
  const fetchBookingDataFromParams = async (serviceId: string, providerId: string) => {
    try {
      // Fetch service type and provider info
      const [serviceResponse, providerResponse, listingResponse] = await Promise.all([
        supabase
          .from('service_types')
          .select('*')
          .eq('id', serviceId)
          .single(),
        supabase
          .from('users')
          .select('id, name')
          .eq('id', providerId)
          .single(),
        supabase
          .from('listings')
          .select('*')
          .eq('service_type_id', serviceId)
          .eq('provider_id', providerId)
          .eq('is_active', true)
          .limit(1)
          .single()
      ]);
      
      if (serviceResponse.error || providerResponse.error) {
        throw new Error("Error fetching booking information");
      }
      
      const service = serviceResponse.data;
      const provider = providerResponse.data;
      const listing = listingResponse.data;
      
      const reconstructedBookingData = {
        serviceId: listing?.id || serviceId,
        serviceName: listing?.title || service.name || 'Servicio',
        providerId: provider.id,
        providerName: provider.name || 'Proveedor',
        price: listing?.base_price || 0,
        duration: listing?.duration || 60,
        startTime: null,
        notes: '',
        frequency: 'once',
        requiresScheduling: true
      };
      
      console.log("Reconstructed booking data:", reconstructedBookingData);
      setBookingData(reconstructedBookingData);
    } catch (error) {
      console.error("Error fetching booking data from params:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información de la reserva",
        variant: "destructive"
      });
      navigate('/client');
    }
  };
  
  // Scroll to top when component mounts
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    scrollToTop();
    const timeoutId = setTimeout(scrollToTop, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Verify authentication
  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar un servicio",
        variant: "destructive"
      });
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }
  }, [isAuthenticated, user, bookingData]);
  
  // If no booking data yet, show loading
  if (!bookingData) {
    return (
      <PageContainer title="Cargando información de reserva...">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </PageContainer>
    );
  }
  
  // Validate required data
  const hasRequiredData = !!(
    bookingData.serviceName &&
    bookingData.providerName &&
    bookingData.duration &&
    typeof bookingData.price === 'number'
  );

  // Format price safely to avoid NaN
  const formattedPrice = typeof bookingData.price === 'number' && !isNaN(bookingData.price)
    ? bookingData.price.toFixed(2)
    : '0.00';
  
  // Format duration to hours and minutes (HH:MM)
  const formatDurationHHMM = (minutes) => {
    if (!minutes || isNaN(minutes)) return '00:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleConfirm = () => {
    // Validate authentication
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para reservar un servicio",
        variant: "destructive"
      });
      navigate('/login', { state: { redirectTo: location.pathname, bookingData } });
      return;
    }
    
    // Validate required data
    if (!hasRequiredData) {
      toast({
        title: "Error",
        description: "Faltan datos necesarios para completar la reserva",
        variant: "destructive"
      });
      return;
    }
    
    // Validate date and time selection
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha y hora para el servicio",
        variant: "destructive"
      });
      return;
    }

    // Validate recurrence selection
    if (!selectedFrequency) {
      toast({
        title: "Error",
        description: "Por favor selecciona la frecuencia del servicio",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    createAppointmentMutation.mutate();
  };
  
  // Format date if exists
  const formattedDate = selectedDate
    ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
    : 'No seleccionada';
    
  // Format time in 12-hour format if exists
  const formatTimeTo12Hour = (time24: string | undefined): string => {
    if (!time24) return 'No seleccionada';
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };
  
  const formattedTime = formatTimeTo12Hour(selectedTime);

  // Check if we can continue (all required fields filled)
  const canContinue = hasRequiredData && 
    selectedDate && 
    selectedTime && 
    selectedFrequency;

  return (
    <PageContainer
      title="Confirmar Reserva"
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
      <div className="max-w-lg mx-auto space-y-6">
        {/* 1. Recurrence Selector - NOW AT THE TOP */}
        <RecurrenceSelector
          selectedFrequency={selectedFrequency}
          onFrequencyChange={setSelectedFrequency}
        />
        
        {/* 2. Date and Time Selector - WITH RECURRENCE INFO */}
        <DateTimeSelector 
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedTime={selectedTime}
          onTimeChange={setSelectedTime}
          providerId={bookingData.providerId}
          recurrence={selectedFrequency}
        />
        
        {/* 3. Booking Summary */}
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-6">Resumen del servicio</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio:</span>
                <span className="font-medium">{bookingData.serviceName || 'No especificado'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proveedor:</span>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">{bookingData.providerName || 'No especificado'}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración:</span>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium">
                    {bookingData.duration 
                      ? formatDurationHHMM(bookingData.duration) 
                      : '00:00'}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-luxury-navy" />
                  <span className="font-medium capitalize">{formattedDate}</span>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hora:</span>
                <span className="font-medium">{formattedTime}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frecuencia:</span>
                <span className="font-medium capitalize">{
                  selectedFrequency === 'once' ? 'Una vez' : 
                  selectedFrequency === 'weekly' ? 'Semanal' :
                  selectedFrequency === 'biweekly' ? 'Quincenal' : 
                  selectedFrequency === 'monthly' ? 'Mensual' :
                  selectedFrequency
                }</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Observaciones:</span>
                <span className="font-medium text-right">{bookingData.notes || 'Ninguna'}</span>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="flex justify-between text-lg font-semibold mb-6">
              <span>Precio total:</span>
              <span className="text-luxury-navy">${formattedPrice}</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={handleBack}
                disabled={isSubmitting || isCreating}
              >
                Volver
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white" 
                onClick={handleConfirm}
                disabled={isSubmitting || isCreating || !canContinue}
              >
                {(isSubmitting || isCreating) ? 'Enviando...' : 'Confirmar Reserva'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default BookingSummary;
