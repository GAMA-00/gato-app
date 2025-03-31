
import React, { useState } from 'react';
import { Plus, Calendar, Clock, Star, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { MOCK_APPOINTMENTS, MOCK_SERVICES, MOCK_CLIENTS, getDashboardStats } from '@/lib/data';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, addDays } from 'date-fns';
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

// Mock ratings data
const mockRatings = [
  { month: 'Ene', rating: 4.5 },
  { month: 'Feb', rating: 4.2 },
  { month: 'Mar', rating: 4.7 },
  { month: 'Abr', rating: 4.8 },
  { month: 'May', rating: 4.6 },
  { month: 'Jun', rating: 4.9 }
];

// Mock new clients data
const mockNewClients = [
  {
    id: 'nc1',
    name: 'María López',
    address: 'Torre Norte, Apt 502',
    service: 'Limpieza Estándar',
    date: new Date(2023, 5, 28)
  },
  {
    id: 'nc2',
    name: 'Juan García',
    address: 'Edificio Sol, Apt 305',
    service: 'Limpieza Profunda',
    date: new Date(2023, 5, 26)
  },
  {
    id: 'nc3',
    name: 'Ana Torres',
    address: 'Residencial Vista, Apt 203',
    service: 'Mantenimiento',
    date: new Date(2023, 5, 25)
  }
];

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  const [ratingView, setRatingView] = useState<'latest' | 'average'>('latest');
  
  // Filter appointments for tomorrow
  const tomorrowsAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, tomorrow))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  const handleAddAppointment = () => {
    navigate('/calendar');
  };

  // Function to render an appointment card
  const renderAppointmentCard = (appointment) => {
    const service = MOCK_SERVICES.find(s => s.id === appointment.serviceId);
    const client = MOCK_CLIENTS.find(c => c.id === appointment.clientId);
    
    if (!service || !client) return null;
    
    return (
      <div key={appointment.id} className="p-4 border-b last:border-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-primary font-medium">
                {client.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h4 className="font-medium">{client.name}</h4>
              <p className="text-sm text-muted-foreground">{service.name}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center text-sm font-medium">
              <Clock className="h-3.5 w-3.5 mr-1 text-primary" />
              {format(appointment.startTime, 'h:mm a')} - {format(appointment.endTime, 'h:mm a')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {client.address.split(',')[0]} {/* Showing first part of address as building */}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a new client card
  const renderNewClientCard = (client) => {
    return (
      <div key={client.id} className="p-4 border-b last:border-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-primary font-medium">
                {client.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            <div>
              <h4 className="font-medium">{client.name}</h4>
              <p className="text-sm text-muted-foreground">{client.service}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              Desde {format(client.date, 'dd MMM yyyy')}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {client.address}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRatingData = () => {
    const averageRating = (mockRatings.reduce((sum, item) => sum + item.rating, 0) / mockRatings.length).toFixed(1);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-semibold">{ratingView === 'latest' ? '4.9' : averageRating}</h3>
            <p className="text-sm text-muted-foreground">
              {ratingView === 'latest' ? 'Calificación más reciente' : 'Calificación promedio'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={ratingView === 'latest' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setRatingView('latest')}
            >
              Reciente
            </Button>
            <Button 
              variant={ratingView === 'average' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setRatingView('average')}
            >
              Promedio
            </Button>
          </div>
        </div>
        
        <div className="h-64">
          <ChartContainer config={{ rating: { color: '#9b87f5' } }}>
            <BarChart data={mockRatings}>
              <XAxis dataKey="month" />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <Bar dataKey="rating" fill="var(--color-rating)" radius={[4, 4, 0, 0]} />
              <ChartTooltip
                content={<ChartTooltipContent />}
              />
            </BarChart>
          </ChartContainer>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
            <span>5% vs mes anterior</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 text-amber-500 mr-1" />
            <span>25 calificaciones este mes</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      action={
        <Button onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      }
    >
      <div className="space-y-8">
        {/* New Clients */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl flex items-center">
              <Users className="mr-2 h-5 w-5 text-primary" />
              Nuevos Clientes
            </CardTitle>
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
              {mockNewClients.length} clientes
            </span>
          </CardHeader>
          <CardContent>
            {mockNewClients.length > 0 ? (
              <div className="divide-y">
                {mockNewClients.map(renderNewClientCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay clientes nuevos</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Rating Visualization */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl flex items-center">
              <Star className="mr-2 h-5 w-5 text-primary" />
              Calificaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderRatingData()}
          </CardContent>
        </Card>
        
        {/* Tomorrow's Appointments */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Citas de Mañana
            </CardTitle>
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
              {tomorrowsAppointments.length} citas
            </span>
          </CardHeader>
          <CardContent>
            {tomorrowsAppointments.length > 0 ? (
              <div className="divide-y">
                {tomorrowsAppointments.map(renderAppointmentCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay citas programadas para mañana</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Performance Statistics */}
        <DashboardStats stats={stats} />
        
        {/* Quick Stats - at the bottom */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl">
              Estadísticas Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm">Servicio Más Popular</p>
                <p className="font-medium">Limpieza Estándar de Hogar</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm">Día Más Ocupado</p>
                <p className="font-medium">Miércoles</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm">Duración Promedio de Cita</p>
                <p className="font-medium">90 minutos</p>
              </div>
              
              <div>
                <p className="text-muted-foreground text-sm">Satisfacción del Cliente</p>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-muted">
                    <div style={{ width: "85%" }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"></div>
                  </div>
                  <p className="text-xs text-right mt-1">85%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
