
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { SERVICE_SUBCATEGORIES } from '@/lib/subcategories';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Home, Scissors, PawPrint, Dumbbell, Book } from 'lucide-react';
import RecurringServicesList from '@/components/client/RecurringServicesList';
import { Service } from '@/lib/types';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';
import { Button } from '@/components/ui/button';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home': <Home className="h-5 w-5" />,
  'personal-care': <Scissors className="h-5 w-5" />,
  'pets': <PawPrint className="h-5 w-5" />,
  'sports': <Dumbbell className="h-5 w-5" />,
  'classes': <Book className="h-5 w-5" />
};

const ClientHome = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices);
        setServices(parsedServices);
      } catch (err) {
        console.error('Error parsing services:', err);
      }
    }
  }, []);

  // Filter recurring services (those the user has booked multiple times)
  const recurringServices = services.filter(service => {
    // TODO: Implement proper recurring service logic
    // For now, using a placeholder logic
    return service.category === 'home';
  });

  return (
    <PageContainer title="Available Services">
      <Tabs 
        defaultValue="all" 
        className="w-full" 
        value={activeTab} 
        onValueChange={setActiveTab}
      >
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="all" className="flex-1">
            All Services
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-2 flex-1">
            Recurring
            <RecurringServicesIndicator count={recurringServices.length} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recurring">
          <RecurringServicesList services={recurringServices} />
        </TabsContent>

        <TabsContent value="all">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {Object.entries(SERVICE_CATEGORIES).map(([categoryId, category]) => (
              <DropdownMenu key={categoryId}>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full h-auto py-6 flex flex-col items-center gap-2 text-base border-2"
                    style={{ color: category.color }}
                  >
                    {CATEGORY_ICONS[categoryId]}
                    {category.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {SERVICE_SUBCATEGORIES[categoryId]?.map((subcategory) => (
                    <DropdownMenuItem
                      key={subcategory}
                      onClick={() => navigate(`/client/services/${categoryId}/${subcategory}`)}
                    >
                      {subcategory}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ClientHome;
