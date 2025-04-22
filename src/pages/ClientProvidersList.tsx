
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { MOCK_SERVICES } from '@/lib/data';
import { Book, Home, Scissors, PawPrint, Dumbbell } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home': <Home className="h-6 w-6" />,
  'personal-care': <Scissors className="h-6 w-6" />,
  'pets': <PawPrint className="h-6 w-6" />,
  'sports': <Dumbbell className="h-6 w-6" />,
  'classes': <Book className="h-6 w-6" />
};

const categoryLabels: Record<string, string> = {
  'home': 'Hogar',
  'personal-care': 'Cuidado Personal',
  'pets': 'Mascotas',
  'sports': 'Deportes',
  'classes': 'Clases'
};

const ClientProvidersList = () => {
  const { category, subcat } = useParams();
  const navigate = useNavigate();

  // Filter services by category and subcat (using service name includes subcat)
  const matchingServices = MOCK_SERVICES.filter(
    (service) =>
      service.category === category &&
      service.name.toLowerCase().includes(subcat ? subcat.toLowerCase() : '')
  );

  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const titleText = subcat || '';

  return (
    <PageContainer
      title={
        <div className="flex items-center gap-2">
          {categoryIcon}
          <span>{titleText}</span>
        </div>
      }
      subtitle={
        <button
          className="text-sm text-muted-foreground hover:underline mb-2"
          onClick={() => navigate('/client')}
        >
          &larr; Volver a categorías
        </button>
      }
    >
      <div className="max-w-lg mx-auto space-y-4">
        {matchingServices.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Aun no hay proveedores de servicio en esta categoria :/
          </div>
        ) : (
          matchingServices.map((service) => (
            <Card
              key={service.id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/client/book/1/${service.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-sm text-muted-foreground">${service.price.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
};

export default ClientProvidersList;
