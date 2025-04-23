
import React, { useState, useEffect } from 'react';
import { Calendar, Eye, EyeOff, Users, Clock, PieChart, BarChart } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import AppointmentList from '@/components/dashboard/AppointmentList';
import QuickStats from '@/components/dashboard/QuickStats';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { getDashboardStats } from '@/lib/data';
import { isSameDay, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/contexts/AuthContext';
import { Appointment, DashboardStats as DashboardStatsType, AdminStats } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock admin stats
const MOCK_ADMIN_STATS: AdminStats = {
  totalAppointments: 150,
  pendingAppointments: 25,
  completedAppointments: 100,
  cancelledAppointments: 25,
  totalRevenue: 15000,
  totalClients: 45,
  recurringClients: 30,
  occasionalClients: 15,
  totalProviders: 12,
  activeProviders: 10
};

const StatisticsSection = ({ 
  title, 
  defaultOpen = true, 
  children 
}: { 
  title: string, 
  defaultOpen?: boolean,
  children: React.ReactNode 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            {isOpen ? 
              <EyeOff className="h-4 w-4" /> : 
              <Eye className="h-4 w-4" />
            }
            <span className="sr-only">
              {isOpen ? 'Ocultar' : 'Mostrar'} {title}
            </span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

const AdminDashboard = () => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Citas Pendientes</p>
            <h3 className="text-2xl font-semibold">{MOCK_ADMIN_STATS.pendingAppointments}</h3>
          </div>
          <Clock className="h-8 w-8 text-primary" />
        </div>
        
        <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Clientes Recurrentes</p>
            <h3 className="text-2xl font-semibold">{MOCK_ADMIN_STATS.recurringClients}</h3>
          </div>
          <Users className="h-8 w-8 text-primary" />
        </div>
        
        <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Proveedores Activos</p>
            <h3 className="text-2xl font-semibold">{MOCK_ADMIN_STATS.activeProviders}</h3>
          </div>
          <Users className="h-8 w-8 text-primary" />
        </div>
        
        <div className="bg-primary/10 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ingresos Totales</p>
            <h3 className="text-2xl font-semibold">${MOCK_ADMIN_STATS.totalRevenue.toLocaleString()}</h3>
          </div>
          <BarChart className="h-8 w-8 text-primary" />
        </div>
      </div>
      
      <Tabs defaultValue="orders" className="mb-6">
        <TabsList>
          <TabsTrigger value="orders">Órdenes Pendientes</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="providers">Proveedores</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders" className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Órdenes Pendientes de Aprobación</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Juan Pérez</TableCell>
                <TableCell>Limpieza de Hogar</TableCell>
                <TableCell>María García</TableCell>
                <TableCell>25/04/2025 10:00</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Aprobar</Button>
                    <Button variant="outline" size="sm" className="text-red-500">Rechazar</Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ana López</TableCell>
                <TableCell>Jardinería</TableCell>
                <TableCell>Carlos Ruiz</TableCell>
                <TableCell>26/04/2025 15:30</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">Aprobar</Button>
                    <Button variant="outline" size="sm" className="text-red-500">Rechazar</Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="clients" className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Clientes Recurrentes</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Citas Totales</TableHead>
                <TableHead>Última Cita</TableHead>
                <TableHead>Proveedores Preferidos</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Juan Pérez</TableCell>
                <TableCell>15</TableCell>
                <TableCell>20/04/2025</TableCell>
                <TableCell>María García, Luis Torres</TableCell>
                <TableCell>Activo</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ana López</TableCell>
                <TableCell>8</TableCell>
                <TableCell>18/04/2025</TableCell>
                <TableCell>Carlos Ruiz</TableCell>
                <TableCell>Activo</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <h3 className="text-lg font-medium my-4">Clientes Ocasionales</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Citas Totales</TableHead>
                <TableHead>Última Cita</TableHead>
                <TableHead>Proveedores Utilizados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Roberto Méndez</TableCell>
                <TableCell>2</TableCell>
                <TableCell>15/04/2025</TableCell>
                <TableCell>María García</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Sofía Castro</TableCell>
                <TableCell>1</TableCell>
                <TableCell>10/04/2025</TableCell>
                <TableCell>Carlos Ruiz</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
        
        <TabsContent value="providers" className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Proveedores Activos</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Citas Activas</TableHead>
                <TableHead>Citas Totales</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>María García</TableCell>
                <TableCell>Limpieza, Jardinería</TableCell>
                <TableCell>5</TableCell>
                <TableCell>45</TableCell>
                <TableCell>4.8 ★</TableCell>
                <TableCell>Activo</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Carlos Ruiz</TableCell>
                <TableCell>Jardinería, Mantenimiento</TableCell>
                <TableCell>3</TableCell>
                <TableCell>32</TableCell>
                <TableCell>4.5 ★</TableCell>
                <TableCell>Activo</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Distribución de Servicios</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <PieChart className="h-12 w-12 text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Gráfico de Distribución</span>
          </div>
        </div>
        
        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-4">Ingresos Mensuales</h3>
          <div className="h-64 bg-muted rounded-md flex items-center justify-center">
            <BarChart className="h-12 w-12 text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Gráfico de Ingresos</span>
          </div>
        </div>
      </div>
    </>
  );
};

const ProviderDashboard = ({ 
  appointments, 
  todaysAppointments,
  tomorrowsAppointments,
  stats 
}: { 
  appointments: Appointment[],
  todaysAppointments: Appointment[],
  tomorrowsAppointments: Appointment[],
  stats: DashboardStatsType
}) => {
  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <AppointmentList
            appointments={todaysAppointments}
            title="Citas de Hoy"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para hoy"
          />

          <AppointmentList
            appointments={tomorrowsAppointments}
            title="Citas de Mañana"
            icon={<Calendar className="mr-2 h-5 w-5 text-primary" />}
            emptyMessage="No hay citas programadas para mañana"
          />
        </div>

        <QuickStats />
        
        <DashboardStats stats={stats} />
      </div>
    </>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStatsType>(getDashboardStats());
  
  // Load appointments from localStorage
  useEffect(() => {
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
      }
    }
  }, []);
  
  // Filter appointments for the current provider
  const providerAppointments = user && user.role === 'provider'
    ? appointments.filter(appointment => appointment.providerId === user.id)
    : [];
  
  const today = new Date();
  const tomorrow = addDays(new Date(), 1);
  
  const todaysAppointments = providerAppointments
    .filter(app => isSameDay(app.startTime, today))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    
  const tomorrowsAppointments = providerAppointments
    .filter(app => isSameDay(app.startTime, tomorrow))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  const renderDashboardByRole = () => {
    if (user?.role === 'admin') {
      return <AdminDashboard />;
    } else {
      return (
        <ProviderDashboard 
          appointments={providerAppointments}
          todaysAppointments={todaysAppointments}
          tomorrowsAppointments={tomorrowsAppointments}
          stats={stats}
        />
      );
    }
  };

  return (
    <PageContainer 
      title="Inicio" 
      subtitle="Bienvenido de nuevo"
      className="pt-0"
    >
      {renderDashboardByRole()}
    </PageContainer>
  );
};

export default Dashboard;
