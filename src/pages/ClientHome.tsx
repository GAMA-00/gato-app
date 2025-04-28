
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Scissors, Dog, Dumbbell, Book, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import RecurringServicesList from '@/components/client/RecurringServicesList';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';
import { useCategories } from '@/hooks/useCategories';
import { Service } from '@/lib/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'house': <Home className="h-5 w-5" />,
  'scissors': <Scissors className="h-5 w-5" />,
  'dog': <Dog className="h-5 w-5" />,
  'dumbbell': <Dumbbell className="h-5 w-5" />,
  'book': <Book className="h-5 w-5" />,
  'wrench': <Wrench className="h-5 w-5" />
};

const ClientHome = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const { data, isLoading } = useCategories();
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    const savedAppointments = localStorage.getItem('gato_appointments');
    
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices);
        setServices(parsedServices);
      } catch (err) {
        console.error('Error parsing services:', err);
      }
    }
  }, []);

  const recurringServices = services.filter(service => {
    return service.subcategoryId === 'home' || service.category === 'home';
  });

  return (
    <PageContainer title="Servicios Disponibles">
      <Tabs 
        defaultValue="all" 
        className="w-full" 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="all" className="flex-1">
            Todos los servicios
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2 flex-1">
            Recurrente
            <RecurringServicesIndicator count={recurringServices.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recurring">
          <RecurringServicesList services={recurringServices} />
        </TabsContent>

        <TabsContent value="all">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-pulse">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {data?.categories?.map((category) => (
                <DropdownMenu key={category.id}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-6 flex flex-col items-center gap-2 text-base border-2"
                    >
                      {CATEGORY_ICONS[category.icon]}
                      {category.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    {data.serviceTypesByCategory[category.id]?.map((serviceType) => (
                      <DropdownMenuItem
                        key={serviceType.id}
                        onClick={() => navigate(`/client/services/${category.name}/${serviceType.name}`)}
                      >
                        {serviceType.name}
                      </DropdownMenuItem>
                    )) || (
                      <DropdownMenuItem disabled>
                        No hay servicios disponibles
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ClientHome;
