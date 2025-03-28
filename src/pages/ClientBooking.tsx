
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_SERVICES } from '@/lib/data';
import { Service, Building } from '@/lib/types';
import { toast } from 'sonner';

// Mock buildings data
const MOCK_BUILDINGS: Building[] = [
  { id: '1', name: 'Sunset Towers', address: '123 Sunset Blvd' },
  { id: '2', name: 'Ocean View Apartments', address: '456 Ocean Dr' },
  { id: '3', name: 'Mountain Heights', address: '789 Mountain Rd' },
  { id: '4', name: 'City Center Residences', address: '101 Main St' },
  { id: '5', name: 'Parkside Condos', address: '202 Park Ave' }
];

// Mock available time slots
const AVAILABLE_TIMES = [
  '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'
];

const ClientBooking = () => {
  const { buildingId, serviceId } = useParams<{ buildingId: string, serviceId: string }>();
  const [building, setBuilding] = useState<Building | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // In a real app, we would fetch this data from an API
    const selectedBuilding = MOCK_BUILDINGS.find(b => b.id === buildingId) || null;
    const selectedService = MOCK_SERVICES.find(s => s.id === serviceId) || null;
    
    setBuilding(selectedBuilding);
    setService(selectedService);
  }, [buildingId, serviceId]);

  const handleBookAppointment = () => {
    if (!selectedDate || !selectedTime) return;
    
    // In a real app, we would send this data to an API
    toast.success('Appointment booked successfully!');
    navigate('/client/bookings');
  };

  if (!building || !service) {
    return (
      <PageContainer title="Loading...">
        <div>Loading service details...</div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Book Appointment"
      subtitle={`${service.name} at ${building.name}`}
    >
      <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Select Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-8 md:flex-row">
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-4">Select a date</h3>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border pointer-events-auto"
                />
              </div>
              
              {selectedDate && (
                <div className="flex-1">
                  <h3 className="text-sm font-medium mb-4">Available times for {format(selectedDate, 'MMM d, yyyy')}</h3>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {AVAILABLE_TIMES.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className="w-full justify-center text-xs md:text-sm py-2 px-1 h-auto min-h-9"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate(`/client/services/${buildingId}`)}>
              Back to Services
            </Button>
            <Button 
              disabled={!selectedDate || !selectedTime}
              onClick={handleBookAppointment}
            >
              Book Appointment
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">{service.name}</h3>
              <p className="text-sm text-muted-foreground">{service.description}</p>
            </div>
            <div className="pt-4 border-t">
              <p className="flex justify-between">
                <span>Duration:</span>
                <span>{service.duration} minutes</span>
              </p>
              <p className="flex justify-between">
                <span>Price:</span>
                <span>${service.price.toFixed(2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Location:</span>
                <span>{building.name}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ClientBooking;
