
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Home, Scissors, PawPrint, Dumbbell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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
  
  // Fetch services from Supabase based on category and name
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services-by-category', category, subcat],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles:provider_id (
            name
          )
        `)
        .eq('category', category)
        .eq('name', subcat);
        
      if (error) throw error;
      
      return data.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.base_price,
        providerId: service.provider_id,
        providerName: service.profiles?.name || 'Proveedor'
      }));
    }
  });

  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const titleText = subcat || '';

  if (isLoading) {
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
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

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
        {services.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Aun no hay proveedores de servicio en esta categoría :/
          </div>
        ) : (
          services.map((service) => (
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
                <div className="text-xs mt-2">Ofrecido por: <span className="font-semibold">{service.providerName}</span></div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
};

export default ClientProvidersList;
