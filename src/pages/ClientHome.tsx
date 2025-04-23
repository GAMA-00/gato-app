
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { SERVICE_SUBCATEGORIES } from '@/lib/subcategories';
import { NavigationMenu } from '@/components/ui/navigation-menu';
import RecurringServicesList from '@/components/client/RecurringServicesList';
import { Service } from '@/lib/types';
import RecurringServicesIndicator from '@/components/client/RecurringServicesIndicator';

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
          <NavigationMenu className="max-w-full overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.entries(SERVICE_CATEGORIES).map(([categoryId, category]) => (
                <div key={categoryId} className="space-y-4">
                  <h3 className="font-medium text-lg" style={{ color: category.color }}>
                    {category.label}
                  </h3>
                  <div className="space-y-2">
                    {SERVICE_SUBCATEGORIES[categoryId]?.map((subcategory) => (
                      <button
                        key={subcategory}
                        onClick={() => navigate(`/client/services/${categoryId}/${subcategory}`)}
                        className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
                      >
                        {subcategory}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </NavigationMenu>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default ClientHome;
