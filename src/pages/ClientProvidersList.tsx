
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Home, Scissors, PawPrint, Dumbbell, ArrowLeft, Star, Shield, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        .from('users')
        .select('residencia_id, condominium_id, condominiums:condominium_id(name), residencias:residencia_id(name, address)')
        .eq('id', user.id)
        .eq('role', 'client')
        .maybeSingle();
        
      if (error) throw error;
      console.log("Client residencia info:", data);
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
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-luxury-beige/70">
              {categoryIcon}
            </div>
            <div>
              <span className="text-luxury-navy font-medium">{titleText}</span>
              <div className="text-xs text-luxury-gray-dark">{categoryLabel}</div>
            </div>
          </div>
        }
        subtitle={
          <button
            className="text-sm text-luxury-navy/80 hover:text-luxury-navy flex items-center gap-1 transition-colors"
            onClick={() => navigate('/client')}
          >
            <ArrowLeft className="h-4 w-4" /> Volver a categorías
          </button>
        }
      >
        <div className="max-w-lg mx-auto space-y-4">
          <Card className="bg-luxury-white border border-neutral-100 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-center relative">
                <p className="text-sm text-luxury-gray-dark">
                  Cargando servicios para {residenciaInfo}...
                </p>
              </div>
            </CardContent>
          </Card>
          
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden bg-luxury-white border border-neutral-100">
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
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-luxury-beige/70">
            {categoryIcon}
          </div>
          <div>
            <span className="text-luxury-navy font-medium">{titleText}</span>
            <div className="text-xs text-luxury-gray-dark">{categoryLabel}</div>
          </div>
        </div>
      }
      subtitle={
        <button
          className="text-sm text-luxury-navy/80 hover:text-luxury-navy flex items-center gap-1 transition-colors"
          onClick={() => navigate('/client')}
        >
          <ArrowLeft className="h-4 w-4" /> Volver a categorías
        </button>
      }
    >
      <div className="max-w-lg mx-auto space-y-4">
        <Card className="bg-luxury-white border border-neutral-100 overflow-hidden shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-luxury-navy">
                Mostrando servicios para:
              </p>
              <Badge variant="outline" className="flex items-center gap-1 bg-luxury-beige/50 border-luxury-beige text-luxury-navy">
                <Filter className="h-3 w-3" />
                {residenciaInfo}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        {listings.length === 0 ? (
          <Card className="bg-luxury-white border border-neutral-100 overflow-hidden shadow-sm">
            <CardContent className="p-8 text-center">
              <Star className="h-12 w-12 text-luxury-beige mx-auto mb-4" />
              <p className="text-luxury-gray-dark">Aun no hay proveedores de servicio en esta categoría</p>
              {clientData?.residencia_id && (
                <div className="mt-4">
                  <p className="text-sm text-luxury-gray-dark mb-2">No se encontraron servicios en tu residencia.</p>
                  <Button 
                    variant="outline"
                    onClick={() => navigate('/client/category/' + category)}
                    className="text-sm bg-luxury-white border-luxury-navy/20 text-luxury-navy hover:bg-luxury-beige/50"
                  >
                    Ver todas las categorías
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="bg-luxury-white border border-neutral-100 overflow-hidden shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm text-luxury-navy">
                  Seleccione el servicio que mejor se adapte a sus necesidades:
                </p>
              </CardContent>
            </Card>
            
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className="overflow-hidden shadow-sm transition-all cursor-pointer border border-neutral-100 group hover:shadow-luxury bg-luxury-white"
                onClick={() => navigate(`/client/book/1/${listing.id}`)}
              >
                <CardContent className="p-4 relative">
                  <div className="flex items-start mb-3">
                    {/* Provider Avatar */}
                    <Avatar className="h-12 w-12 border border-neutral-100">
                      <AvatarFallback className="bg-luxury-beige text-luxury-navy">
                        {listing.providerName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-luxury-navy group-hover:text-luxury-navy/80 transition-colors">{listing.title}</span>
                        <div className="bg-yellow-50 px-2 py-1 rounded-md flex items-center">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          <span className="font-medium text-xs text-yellow-700">{typeof listing.rating === 'number' ? listing.rating.toFixed(1) : listing.rating}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-luxury-gray-dark mt-1">{listing.description}</div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center">
                          <Shield className="h-3 w-3 text-luxury-navy mr-1" />
                          <span className="text-xs text-luxury-gray-dark">Proveedor:</span> 
                          <span className="font-semibold text-xs ml-1 text-luxury-navy">{listing.providerName}</span>
                          <span className="text-xs text-luxury-gray-dark ml-1">
                            ({listing.providerExperience} {listing.providerExperience === 1 ? 'año' : 'años'})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center border-t border-neutral-100 pt-3">
                    <Badge variant="outline" className={`text-xs ${listing.isAvailable ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {listing.isAvailable ? 'Disponible' : 'Disponible más tarde'}
                    </Badge>
                    
                    <div className="flex items-center">
                      <span className="text-xs text-luxury-gray-dark mr-3">
                        {Math.floor(listing.duration / 60) > 0 ? `${Math.floor(listing.duration / 60)}h ` : ''}
                        {listing.duration % 60 > 0 ? `${listing.duration % 60}min` : ''}
                      </span>
                      <span className="font-medium text-base text-luxury-navy">${listing.price.toFixed(2)}</span>
                    </div>
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
