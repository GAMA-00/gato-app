
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { ServiceCategory } from '@/lib/types';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Home, Scissors, PawPrint, Dumbbell, Music } from 'lucide-react';
import { MOCK_SERVICES } from '@/lib/data';

// Definimos las categorías principales y sus servicios
const SERVICE_CATEGORIES = [
  {
    id: 'home' as ServiceCategory,
    name: 'Hogar',
    icon: <Home className="h-6 w-6" />,
    services: ['Limpieza', 'Planchado', 'Jardinero', 'Lavacar', 'Chef', 'Niñera', 'Mantenimiento']
  },
  {
    id: 'personal-care' as ServiceCategory,
    name: 'Cuidado Personal',
    icon: <Scissors className="h-6 w-6" />,
    services: ['Peluquero', 'Masajista', 'Manicurista', 'Maquillista', 'Depilación', 'Fisioterapia']
  },
  {
    id: 'pets' as ServiceCategory,
    name: 'Mascotas',
    icon: <PawPrint className="h-6 w-6" />,
    services: ['Peluquería Canina', 'Paseo de perros']
  },
  {
    id: 'sports' as ServiceCategory,
    name: 'Deportes',
    icon: <Dumbbell className="h-6 w-6" />,
    services: []
  },
  {
    id: 'classes' as ServiceCategory,
    name: 'Clases',
    icon: <Music className="h-6 w-6" />,
    services: ['Música', 'Tutorías', 'Idiomas']
  }
];

const ClientHome = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filtrar servicios disponibles por categoría
  const getServicesForCategory = (categoryId: ServiceCategory) => {
    return MOCK_SERVICES.filter(service => 
      service.category === categoryId && 
      (!user?.buildingId || service.buildingIds.includes(user.buildingId))
    );
  };

  const handleSelectService = (serviceId: string) => {
    if (user?.buildingId) {
      navigate(`/client/book/${user.buildingId}/${serviceId}`);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategory(openCategory === categoryId ? null : categoryId);
  };

  return (
    <PageContainer 
      title="Servicios Disponibles" 
      subtitle={user?.buildingName ? `En ${user.buildingName}` : "Seleccione un servicio para continuar"}
    >
      <div className="max-w-md mx-auto space-y-4">
        {SERVICE_CATEGORIES.map((category) => {
          const availableServices = getServicesForCategory(category.id);
          
          return (
            <Collapsible 
              key={category.id} 
              open={openCategory === category.id}
              onOpenChange={() => toggleCategory(category.id)}
              className="border rounded-lg overflow-hidden"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-background hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted/30 rounded-full">
                    {category.icon}
                  </div>
                  <span className="font-medium">{category.name}</span>
                </div>
                {openCategory === category.id ? 
                  <ChevronUp className="h-5 w-5 text-muted-foreground" /> : 
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                }
              </CollapsibleTrigger>
              
              <CollapsibleContent className="p-4 pt-0 border-t">
                {availableServices.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {availableServices.map((service) => (
                      <Card 
                        key={service.id} 
                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleSelectService(service.id)}
                      >
                        <CardContent className="p-3">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">${service.price.toFixed(2)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground">
                    <p>No hay servicios disponibles en esta categoría.</p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientHome;
