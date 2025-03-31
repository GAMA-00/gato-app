
import React from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageContainer from '@/components/layout/PageContainer';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { MOCK_APPOINTMENTS, MOCK_SERVICES, MOCK_CLIENTS, getDashboardStats } from '@/lib/data';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, addDays } from 'date-fns';

const Dashboard = () => {
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  
  // Filter appointments for today
  const todaysAppointments = MOCK_APPOINTMENTS
    .filter(app => isSameDay(app.startTime, today))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

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

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo a ServiceSync"
      action={
        <Button onClick={handleAddAppointment}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Today's Appointments */}
        <Card className="glassmorphism">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xl flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-primary" />
              Citas de Hoy
            </CardTitle>
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
              {todaysAppointments.length} citas
            </span>
          </CardHeader>
          <CardContent>
            {todaysAppointments.length > 0 ? (
              <div className="divide-y">
                {todaysAppointments.map(renderAppointmentCard)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay citas programadas para hoy</p>
              </div>
            )}
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
        
        {/* Performance Statistics (Simplified) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <DashboardStats stats={stats} />
          </div>
          
          <div className="lg:col-span-4">
            <div className="glassmorphism rounded-lg p-5 h-full">
              <h3 className="text-lg font-medium mb-3">Estadísticas Rápidas</h3>
              
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
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
