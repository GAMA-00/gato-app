
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Home,
  Scissors,
  PawPrint,
  Dumbbell,
  Music
} from 'lucide-react';
import { MOCK_SERVICES } from '@/lib/data';
import { ServiceCategory } from '@/lib/types';

// Define mapping for service category icons
const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  'home': <Home className="h-6 w-6" />,
  'personal-care': <Scissors className="h-6 w-6" />,
  'pets': <PawPrint className="h-6 w-6" />,
  'sports': <Dumbbell className="h-6 w-6" />,
  'classes': <Music className="h-6 w-6" />,
  // Not needed for the main categories view:
  'car-wash': null,
  'gardening': null,
  'cleaning': null,
  'maintenance': null,
  'other': null,
};

type SubcategoryMap = {
  [key in ServiceCategory]?: string[];
};

const SUBCATEGORIES: SubcategoryMap = {
  'home': ['Limpieza', 'Planchado', 'Jardinero', 'Lavacar', 'Chef', 'Niñera', 'Mantenimiento'],
  'personal-care': ['Peluquero', 'Masajista', 'Manicurista', 'Maquillista', 'Depilación', 'Fisioterapia'],
  'pets': ['Peluquería Canina', 'Paseo de perros'],
  'sports': [],
  'classes': ['Música', 'Tutorías', 'Idiomas']
};

const CLIENT_CATEGORIES: ServiceCategory[] = [
  'home',
  'personal-care',
  'pets',
  'sports',
  'classes'
];

const ClientHome = () => {
  const [openCategory, setOpenCategory] = useState<ServiceCategory | null>(null);
  const [openSubcat, setOpenSubcat] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Returns services for a category and subcategory
  const getServices = (category: ServiceCategory, subcategory?: string) => {
    return MOCK_SERVICES.filter((service) =>
      service.category === category &&
      (subcategory
        ? service.name.toLowerCase().includes(subcategory.toLowerCase())
        : true)
    );
  };

  const handleSelectService = (serviceId: string) => {
    if (user?.buildingId) {
      navigate(`/client/book/${user.buildingId}/${serviceId}`);
    }
  };

  const toggleCategory = (category: ServiceCategory) => {
    setOpenCategory(openCategory === category ? null : category);
    setOpenSubcat(null);
  };

  const toggleSubcat = (subcat: string) => {
    setOpenSubcat(openSubcat === subcat ? null : subcat);
  };

  return (
    <PageContainer
      title="Servicios Disponibles"
      subtitle={user?.buildingName ? `En ${user.buildingName}` : "Seleccione una categoría para explorar servicios"}
    >
      <div className="max-w-lg mx-auto space-y-4">
        {CLIENT_CATEGORIES.map((category) => (
          <Collapsible
            key={category}
            open={openCategory === category}
            onOpenChange={() => toggleCategory(category)}
            className="border rounded-lg overflow-hidden"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-background hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted/30 rounded-full">
                  {CATEGORY_ICONS[category]}
                </div>
                <span className="font-medium capitalize">
                  {{
                    'home': 'Hogar',
                    'personal-care': 'Cuidado Personal',
                    'pets': 'Mascotas',
                    'sports': 'Deportes',
                    'classes': 'Clases'
                  }[category]}
                </span>
              </div>
              <span className="text-muted-foreground">
                {(openCategory === category) ? '▲' : '▼'}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 pt-0 border-t">
              {/* Subcategories */}
              {SUBCATEGORIES[category] && SUBCATEGORIES[category]!.length > 0 ? (
                <div className="space-y-3">
                  {SUBCATEGORIES[category]!.map((subcat) => {
                    const services = getServices(category, subcat);
                    return (
                      <Collapsible
                        key={subcat}
                        open={openSubcat === subcat}
                        onOpenChange={() => toggleSubcat(subcat)}
                        className="border rounded-lg"
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-muted/10 rounded hover:bg-muted/20 text-sm">
                          <span>{subcat}</span>
                          <span className="text-muted-foreground">
                            {(openSubcat === subcat) ? '▲' : '▼'}
                          </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 px-3 pb-3">
                          {/* List of services in subcategory */}
                          {services.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {services.map((service) => (
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
                                    <p className="text-xs text-muted-foreground">{service.description}</p>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <div className="py-3 pl-1 text-muted-foreground text-xs">
                              No hay servicios disponibles en esta subcategoría.
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  <p>No hay subcategorías para esta categoría.</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientHome;
