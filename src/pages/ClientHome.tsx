
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Scissors, Dog, Dumbbell, Book, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  const { data, isLoading, error } = useCategories();
  const [services, setServices] = useState<Service[]>([]);

  // Log for debugging
  useEffect(() => {
    if (error) {
      console.error('Error loading categories:', error);
    }
    if (data) {
      console.log('Categories loaded:', data);
    }
  }, [data, error]);

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

  const handleServiceTypeClick = (categoryName: string, serviceTypeName: string) => {
    navigate(`/client/services/${categoryName}/${serviceTypeName}`);
  };

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
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-muted w-48 rounded mb-4"></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, j) => (
                      <div key={j} className="h-16 bg-muted rounded"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center p-8 text-red-500">
              Error loading services. Please try again later.
            </div>
          ) : (
            <div className="space-y-12">
              {data?.categories?.map((category) => (
                <div key={category.id} className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-2">
                    {CATEGORY_ICONS[category.icon] || <Home className="h-5 w-5" />}
                    <h2 className="text-xl font-medium">{category.label}</h2>
                  </div>
                  
                  {data.serviceTypesByCategory[category.id]?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {data.serviceTypesByCategory[category.id].map((serviceType) => (
                        <Card 
                          key={serviceType.id}
                          className="hover:shadow-md transition-all duration-200"
                          onClick={() => handleServiceTypeClick(category.name, serviceType.name)}
                        >
                          <CardContent className="p-4 flex items-center justify-between cursor-pointer">
                            <span className="font-medium">{serviceType.name}</span>
                            <div className="h-2 w-2 rounded-full bg-primary"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No hay servicios disponibles en esta categoría
                    </p>
                  )}
                </div>
              ))}

              {(!data?.categories || data.categories.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No hay categorías disponibles.</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ClientHome;
