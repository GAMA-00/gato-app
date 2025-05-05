
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Home, Scissors, PawPrint, Dumbbell, ArrowLeft, Star, Sparkles, ShieldCheck, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const { user } = useAuth();
  
  // Obtener la residencia del cliente
  const { data: clientData, isLoading: loadingClient } = useQuery({
    queryKey: ['client-residencia', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('clients')
        .select('residencia_id, residencias(name, address)')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });
  
  // Fetch listings from Supabase based on category and service type name
  const { data: listings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['listings-by-category', category, subcat, clientData?.residencia_id],
    queryFn: async () => {
      // First get the service_type_id based on name
      const { data: serviceTypes, error: stError } = await supabase
        .from('service_types')
        .select('id, name, category:category_id(name)')
        .eq('name', subcat || '')
        .limit(1);

      if (stError) throw stError;
      if (!serviceTypes || serviceTypes.length === 0) return [];

      const serviceType = serviceTypes[0];
      
      // Verify that the category matches
      if (serviceType.category && serviceType.category.name !== category) {
        return [];
      }

      let query = supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id,
            name,
            about_me,
            experience_years,
            average_rating
          ),
          listing_residencias(
            residencia_id
          )
        `)
        .eq('service_type_id', serviceType.id)
        .eq('is_active', true);
        
      const { data: listingsData, error: listingsError } = await query;
        
      if (listingsError) throw listingsError;
      
      // Filtrar por residencia del cliente si está disponible
      let filteredListings = listingsData;
      
      if (clientData?.residencia_id) {
        filteredListings = listingsData.filter(listing => {
          return listing.listing_residencias.some(
            (lr: any) => lr.residencia_id === clientData.residencia_id
          );
        });
      }
      
      return filteredListings.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.base_price,
        providerId: listing.provider_id,
        providerName: listing.provider?.name || 'Proveedor',
        providerExperience: listing.provider?.experience_years || 0,
        rating: listing.provider?.average_rating || (Math.random() * 2 + 3).toFixed(1), // Rating del proveedor o simulado
        duration: listing.duration || 60,
        isAvailable: true // Por ahora asumimos que todos están disponibles
      }));
    },
    enabled: !!category && !!subcat
  });

  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const titleText = subcat || '';
  const categoryLabel = category ? categoryLabels[category as keyof typeof categoryLabels] : '';
  const isLoading = loadingClient || loadingListings;

  const residenciaInfo = clientData?.residencias 
    ? `${clientData.residencias.name}`
    : 'Todas las ubicaciones';

  if (isLoading) {
    return (
      <PageContainer
        title={
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600">
              {categoryIcon}
            </div>
            <div>
              <span className="bg-gradient-blue-purple bg-clip-text text-transparent">{titleText}</span>
              <div className="text-xs text-muted-foreground">{categoryLabel}</div>
            </div>
          </div>
        }
        subtitle={
          <button
            className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            onClick={() => navigate('/client')}
          >
            <ArrowLeft className="h-4 w-4" /> Volver a categorías
          </button>
        }
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow-soft mb-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-pattern-dots opacity-50"></div>
            <p className="text-sm text-center text-muted-foreground relative z-10">
              Buscando los mejores proveedores para <span className="font-medium text-navy">{titleText}</span>...
            </p>
          </div>
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-purple-300">
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
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 shadow-sm">
            {categoryIcon}
          </div>
          <div>
            <span className="bg-gradient-blue-purple bg-clip-text text-transparent">{titleText}</span>
            <div className="text-xs text-muted-foreground">{categoryLabel}</div>
          </div>
        </div>
      }
      subtitle={
        <button
          className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          onClick={() => navigate('/client')}
        >
          <ArrowLeft className="h-4 w-4" /> Volver a categorías
        </button>
      }
    >
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow-luxury border border-purple-100/30 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern-dots opacity-50"></div>
          <div className="flex justify-between items-center relative z-10">
            <p className="text-sm text-muted-foreground">
              Mostrando servicios para:
            </p>
            <Badge variant="outline" className="flex items-center gap-1 bg-white/70">
              <Filter className="h-3 w-3" />
              {residenciaInfo}
            </Badge>
          </div>
        </div>
        
        {listings.length === 0 ? (
          <div className="py-12 text-center bg-white/50 rounded-xl shadow-luxury border border-purple-100/50">
            <Star className="h-12 w-12 text-gold-400 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Aun no hay proveedores de servicio en esta categoría</p>
            {clientData?.residencia_id && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">No se encontraron servicios en tu residencia.</p>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/client/category/' + category)}
                  className="text-sm"
                >
                  Ver todas las categorías
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow-luxury border border-purple-100/30 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-pattern-dots opacity-50"></div>
              <p className="text-sm text-muted-foreground relative z-10">
                Seleccione el servicio que mejor se adapte a sus necesidades:
              </p>
            </div>
            
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className="overflow-hidden hover:shadow-luxury transition-all cursor-pointer border-l-4 border-l-indigo-400 group"
                onClick={() => navigate(`/client/book/1/${listing.id}`)}
              >
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-indigo-50/50 rounded-bl-xl"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-navy group-hover:text-indigo-600 transition-colors">{listing.title}</span>
                    <span className="text-sm bg-gradient-to-r from-indigo-100 to-purple-100 px-2 py-1 rounded text-indigo-700 font-medium">
                      ${listing.price.toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">{listing.description}</div>
                  
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center">
                      <ShieldCheck className="h-3 w-3 text-indigo-500 mr-1" />
                      <span className="text-xs text-muted-foreground">Proveedor:</span> 
                      <span className="font-semibold text-xs ml-1 text-navy">{listing.providerName}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({listing.providerExperience} {listing.providerExperience === 1 ? 'año' : 'años'})
                      </span>
                    </div>
                    <div className="flex items-center bg-gold-50 px-2 py-0.5 rounded text-xs">
                      <Star className="h-3 w-3 text-gold-500 mr-1" />
                      <span className="font-medium text-gold-700">{typeof listing.rating === 'number' ? listing.rating.toFixed(1) : listing.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    {listing.isAvailable ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        Disponible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        Disponible más tarde
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(listing.duration / 60) > 0 ? `${Math.floor(listing.duration / 60)}h ` : ''}
                      {listing.duration % 60 > 0 ? `${listing.duration % 60}min` : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientProvidersList;
