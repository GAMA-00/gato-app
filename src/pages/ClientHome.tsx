
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
  Book,
  ArrowRight
} from 'lucide-react';
import { MOCK_SERVICES } from '@/lib/data';
import { ServiceCategory } from '@/lib/types';

// Define mapping for service category icons
const CATEGORY_ICONS: Record<ServiceCategory, React.ReactNode> = {
  'home': <Home className="h-6 w-6" />,
  'personal-care': <Scissors className="h-6 w-6" />,
  'pets': <PawPrint className="h-6 w-6" />,
  'sports': <Dumbbell className="h-6 w-6" />,
  'classes': <Book className="h-6 w-6" />,
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
  'sports': ['Entrenador Personal', 'Pilates', 'Tenis', 'Mecanico de bicis'],
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
  const { user } = useAuth();
  const navigate = useNavigate();

  const toggleCategory = (category: ServiceCategory) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  const handleSubcatSelect = (category: ServiceCategory, subcat: string) => {
    navigate(`/client/services/${category}/${subcat}`);
  };

  return (
    <PageContainer
      title="Servicios"
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
                  {SUBCATEGORIES[category]!.map((subcat) => (
                    <Card
                      key={subcat}
                      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleSubcatSelect(category, subcat)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{subcat}</span>
                          <ArrowRight className="text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
