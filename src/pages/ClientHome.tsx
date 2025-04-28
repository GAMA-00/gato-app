
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Scissors, Dog, Dumbbell, Book, Wrench, ArrowRight, Music, School, Globe, Bike, Camera, PenTool } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import RecurringServicesList from '@/components/client/RecurringServicesList';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';
import { useCategories } from '@/hooks/useCategories';
import { Service } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home': <Home className="h-4 w-4" />,
  'scissors': <Scissors className="h-4 w-4" />,
  'dog': <Dog className="h-4 w-4" />,
  'dumbbell': <Dumbbell className="h-4 w-4" />,
  'book': <Book className="h-4 w-4" />,
  'wrench': <Wrench className="h-4 w-4" />,
  'guitar': <Music className="h-4 w-4" />,
  'school': <School className="h-4 w-4" />,
  'languages': <Globe className="h-4 w-4" />,
  'bicycle': <Bike className="h-4 w-4" />,
  'camera': <Camera className="h-4 w-4" />,
  'yoga': <PenTool className="h-4 w-4" />,
  'tennis': <Dumbbell className="h-4 w-4" />,
  'hand-helping': <Home className="h-4 w-4" />,
  'house': <Home className="h-4 w-4" />
};

// Priority order for categories display
const CATEGORY_PRIORITY = {
  'home': 1,
  'pets': 2,
  'personal-care': 3,
  'sports': 4,
  'classes': 5,
  'other': 6
};

const ClientHome = () => {
  console.log('ClientHome component rendered');
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
    
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices);
        setServices(parsedServices);
        console.log('Services loaded from localStorage:', parsedServices);
      } catch (err) {
        console.error('Error parsing services:', err);
      }
    } else {
      console.log('No services found in localStorage');
    }
  }, []);

  // Updated to filter recurring services based on category rather than subcategoryId
  const recurringServices = services.filter(service => {
    return service.category === 'home';
  });

  const handleServiceTypeClick = (categoryName: string, serviceTypeName: string) => {
    console.log('Service type clicked:', categoryName, serviceTypeName);
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

  // Sort categories based on priority
  const sortedCategories = data?.categories ? [...data.categories].sort((a, b) => {
    const priorityA = CATEGORY_PRIORITY[a.name as keyof typeof CATEGORY_PRIORITY] || 99;
    const priorityB = CATEGORY_PRIORITY[b.name as keyof typeof CATEGORY_PRIORITY] || 99;
    return priorityA - priorityB;
  }) : [];

  console.log('Sorted categories:', sortedCategories);

  return (
    <PageContainer title="Servicios Disponibles">
      <Tabs 
        defaultValue="all" 
        className="w-full" 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 w-full sticky top-0 z-10 bg-background">
          <TabsTrigger value="all" className="flex-1">
            Todos los servicios
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2 flex-1">
            Recurrente
            <RecurringServicesIndicator count={recurringServices.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recurring" className="pb-16">
          <RecurringServicesList services={recurringServices} />
        </TabsContent>

        <TabsContent value="all" className="pb-16 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Cargando servicios...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                No se pudieron cargar los servicios. Por favor, intente de nuevo más tarde.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {sortedCategories.length > 0 ? (
                <>
                  {sortedCategories.map((category, index) => (
                    <div key={category.id} className="animate-fade-in mb-8">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${getCategoryColor(index)}`}>
                        {CATEGORY_ICONS[category.icon] || <Home className="h-4 w-4" />}
                        <h2 className="text-sm font-medium">{category.label}</h2>
                      </div>
                      
                      {data.serviceTypesByCategory[category.id]?.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {data.serviceTypesByCategory[category.id].map((serviceType) => (
                            <Card 
                              key={serviceType.id}
                              className={`hover:shadow-md hover:translate-y-[-2px] transition-all duration-200 border-l-4 ${getCategoryColor(index)}`}
                              onClick={() => handleServiceTypeClick(category.name, serviceType.name)}
                            >
                              <CardContent className="p-3 flex items-center justify-between cursor-pointer">
                                <span className="font-medium text-xs">{serviceType.name}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
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
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay categorías disponibles.</p>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ClientHome;
