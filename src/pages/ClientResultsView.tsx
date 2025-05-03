
import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Calendar, Clock, Star, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

// Definición de tipo para proveedor procesado
interface ProcessedProvider {
  id: string;
  name: string;
  avatar: string | null;
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  rating: number;
  experience: number;
  aboutMe: string;
  createdAt: string;
}

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingPrefs = location.state || {};
  
  // Consultar proveedores disponibles con manejo seguro de los campos
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['available-providers', serviceId, categoryName],
    queryFn: async () => {
      // Obtener todos los proveedores que ofrezcan este servicio
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            users(
              avatar_url,
              created_at
            )
          )
        `)
        .eq('service_type_id', serviceId);
        
      if (error) throw error;
      
      return listings.map(listing => {
        // Extraemos los datos del provider de forma segura
        const provider = listing.provider || {};
        
        // Safely access nested users data with proper type checking
        let avatarUrl = null;
        let createdAt = new Date().toISOString();
        
        if (provider && typeof provider === 'object') {
          // Check if users exists and handle it accordingly
          const usersData = provider.users;
          
          if (usersData) {
            // Handle both array and object cases for users
            if (Array.isArray(usersData) && usersData.length > 0) {
              avatarUrl = usersData[0]?.avatar_url || null;
              createdAt = usersData[0]?.created_at || createdAt;
            } else if (typeof usersData === 'object') {
              avatarUrl = usersData.avatar_url || null;
              createdAt = usersData.created_at || createdAt;
            }
          }
        }
        
        return {
          id: provider?.id || '',
          name: provider?.name || 'Proveedor',
          avatar: avatarUrl,
          serviceId: listing.id || '',
          serviceName: listing.title || '',
          price: listing.base_price || 0,
          duration: listing.duration || 0,
          rating: provider?.average_rating || 0,
          experience: provider?.experience_years || 0,
          aboutMe: provider?.about_me || '',
          createdAt: createdAt
        } as ProcessedProvider;
      });
    }
  });
  
  const handleBack = () => {
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };
  
  const handleProviderSelect = (provider: ProcessedProvider) => {
    navigate(`/client/provider/${provider.id}`, {
      state: {
        bookingData: {
          ...bookingPrefs,
          serviceId: serviceId,
          categoryName: categoryName
        }
      }
    });
  };

  return (
    <PageContainer
      title="Profesionales disponibles"
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a detalles de reserva</span>
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Resumen de la reserva */}
        <Card className="mb-6 bg-luxury-beige border-0">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Tu reserva</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {bookingPrefs.frequency && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-luxury-navy" />
                  <span>
                    {bookingPrefs.frequency === 'once' ? 'Una vez' : 
                     bookingPrefs.frequency === 'weekly' ? 'Semanal' : 
                     bookingPrefs.frequency === 'biweekly' ? 'Quincenal' : 
                     'Personalizada'}
                  </span>
                </div>
              )}
              
              {bookingPrefs.selectedDays?.length > 0 && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-luxury-navy" />
                  <span>
                    {bookingPrefs.selectedDays.map((day: number) => 
                      ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][day]
                    ).join(', ')}
                  </span>
                </div>
              )}
              
              {bookingPrefs.timeSlot && (
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-luxury-navy" />
                  <span>
                    {bookingPrefs.timePreference === 'flexible' 
                      ? `Entre ${bookingPrefs.timeSlot}h` 
                      : `A las ${bookingPrefs.timeSlot}`}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {isLoading ? (
          // Esqueleto para carga
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex p-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="ml-4 flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-10 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          providers.length === 0 ? (
            // No hay proveedores disponibles
            <div className="text-center py-8">
              <User className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-2" />
              <p className="text-lg font-medium">No hay profesionales disponibles</p>
              <p className="text-muted-foreground mb-6">
                No encontramos profesionales para este servicio en este momento.
              </p>
              <Button onClick={handleBack}>
                Volver a detalles de reserva
              </Button>
            </div>
          ) : (
            // Lista de proveedores
            <div className="space-y-4">
              {providers.map((provider) => (
                <Card 
                  key={provider.id}
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProviderSelect(provider)}
                >
                  <CardContent className="p-0">
                    <div className="flex p-4">
                      {/* Avatar */}
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
                        <AvatarFallback>
                          {provider.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Información */}
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{provider.name}</h3>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="font-medium">{provider.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {provider.experience} {provider.experience === 1 ? 'año' : 'años'} de experiencia
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{provider.serviceName}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(provider.duration / 60)}h {provider.duration % 60}min
                            </span>
                          </div>
                          
                          <div className="flex items-center">
                            <div className="mr-2 text-right">
                              <span className="font-medium">${provider.price.toFixed(2)}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
    </PageContainer>
  );
};

export default ClientResultsView;
