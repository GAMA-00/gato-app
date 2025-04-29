
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Scissors, PawPrint, Dumbbell, Book, ArrowRight, 
         Music, Globe, Bike, Camera, Heart, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import RecurringServicesList from '@/components/client/RecurringServicesList';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';
import { useCategories } from '@/hooks/useCategories';
import { Service } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home': <Home className="h-4 w-4" />,
  'personal-care': <Scissors className="h-4 w-4" />,
  'pets': <PawPrint className="h-4 w-4" />,
  'sports': <Dumbbell className="h-4 w-4" />,
  'classes': <Book className="h-4 w-4" />,
  'music': <Music className="h-4 w-4" />,
  'languages': <Globe className="h-4 w-4" />,
  'cycling': <Bike className="h-4 w-4" />,
  'photography': <Camera className="h-4 w-4" />,
  'health': <Heart className="h-4 w-4" />,
  'favorite': <Star className="h-4 w-4" />
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
      'border-indigo-500 bg-indigo-50 text-indigo-700',
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

  return (
    <PageContainer 
      title={
        <div className="flex items-center space-x-2">
          <span className="text-gradient-primary font-semibold">Servicios Premium</span>
        </div>
      }
      subtitle={
        <span className="text-muted-foreground">Descubre nuestros servicios exclusivos</span>
      }
    >
      <div className="bg-gradient-to-br from-white to-purple-50 p-5 rounded-xl shadow-soft mb-6">
        <h2 className="text-lg font-medium mb-2 text-navy">Bienvenido a nuestra plataforma exclusiva</h2>
        <p className="text-sm text-muted-foreground">
          Encuentra los mejores servicios personalizados y de alta calidad para tu hogar y estilo de vida.
        </p>
      </div>

      <Tabs 
        defaultValue="all" 
        className="w-full" 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 w-full sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
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
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-purple-100 animate-spin border-t-indigo-500"></div>
                <Loader2 className="h-8 w-8 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <span className="text-muted-foreground">Cargando servicios exclusivos...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive" className="animate-fade-in">
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
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 ${getCategoryColor(index)} shadow-sm`}>
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
                              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-indigo-50/50 rounded-bl-xl"></div>
                              <CardContent className="p-3 flex items-center justify-between cursor-pointer">
                                <span className="font-medium text-xs">{serviceType.name}</span>
                                <ArrowRight className="h-3 w-3 text-indigo-400" />
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
                <div className="text-center py-12 bg-white/50 rounded-xl shadow-soft border border-purple-100/50">
                  <Star className="h-12 w-12 text-amber-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Servicios premium próximamente disponibles.</p>
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
