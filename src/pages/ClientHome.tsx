
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Scissors, Dog, Dumbbell, Book, Wrench, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import RecurringServicesList from '@/components/client/RecurringServicesList';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';
import { useCategories } from '@/hooks/useCategories';
import { Service } from '@/lib/types';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'house': <Home className="h-4 w-4" />,
  'scissors': <Scissors className="h-4 w-4" />,
  'dog': <Dog className="h-4 w-4" />,
  'dumbbell': <Dumbbell className="h-4 w-4" />,
  'book': <Book className="h-4 w-4" />,
  'wrench': <Wrench className="h-4 w-4" />
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

  const getCategoryColor = (index: number) => {
    const colors = [
      'border-blue-500 bg-blue-50 text-blue-700',
      'border-emerald-500 bg-emerald-50 text-emerald-700',
      'border-amber-500 bg-amber-50 text-amber-700',
      'border-purple-500 bg-purple-50 text-purple-700',
      'border-rose-500 bg-rose-50 text-rose-700',
      'border-cyan-500 bg-cyan-50 text-cyan-700',
    ];
    return colors[index % colors.length];
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
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-muted w-36 rounded mb-3"></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[...Array(10)].map((_, j) => (
                      <div key={j} className="h-12 bg-muted rounded"></div>
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
            <div className="space-y-8">
              {data?.categories?.map((category, index) => (
                <div key={category.id} className="animate-fade-in">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${getCategoryColor(index)}`}>
                    {CATEGORY_ICONS[category.icon] || <Home className="h-4 w-4" />}
                    <h2 className="text-sm font-medium">{category.label}</h2>
                  </div>
                  
                  {data.serviceTypesByCategory[category.id]?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {data.serviceTypesByCategory[category.id].map((serviceType) => (
                        <Card 
                          key={serviceType.id}
                          className={`hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 border-l-4 ${getCategoryColor(index)}`}
                          onClick={() => handleServiceTypeClick(category.name, serviceType.name)}
                        >
                          <CardContent className="p-3 flex items-center justify-between cursor-pointer">
                            <span className="font-medium text-sm">{serviceType.name}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No hay servicios disponibles en esta categoría
                    </p>
                  )}
                </div>
              ))}

              {(!data?.categories || data.categories.length === 0) && (
                <div className="text-center py-8">
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
