
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { MessageSquare, Search, Filter } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useCommissionRate } from '@/hooks/useCommissionRate';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const ClientServices = () => {
  const { residenciaId, categoryId } = useParams();
  const navigate = useNavigate();
  const { startNewConversation } = useChat();
  const { commissionRate } = useCommissionRate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recommended');
  
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['client-services', residenciaId, categoryId],
    queryFn: async () => {
      let query = supabase
        .from('listing_residencias')
        .select('listing_id');
      
      if (residenciaId) {
        query = query.eq('residencia_id', residenciaId);
      }
        
      const { data: listingResidencias, error: lrError } = await query;
        
      if (lrError) throw lrError;
      
      // If no listings for this residencia, return empty array
      if (!listingResidencias || listingResidencias.length === 0) return [];
      
      // Get the actual listings
      let listingsQuery = supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(
              id,
              name,
              label,
              icon
            )
          ),
          provider:provider_id(
            id,
            name,
            average_rating,
            experience_years,
            certification_files
          )
        `)
        .in('id', listingResidencias.map(lr => lr.listing_id));
      
      // Filter by category if provided
      if (categoryId) {
        listingsQuery = listingsQuery.eq('service_type.category.name', categoryId);
      }
        
      const { data: listingsData, error: listingsError } = await listingsQuery;
        
      if (listingsError) throw listingsError;
      
      return listingsData.map(listing => {
        // Check if provider has certifications
        const hasCertifications = listing.provider?.certification_files 
          ? JSON.parse(listing.provider.certification_files).length > 0
          : false;
          
        return {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          categoryId: listing.service_type?.category?.name || '',
          categoryName: listing.service_type?.category?.label || 'Otros',
          categoryIcon: listing.service_type?.category?.icon || 'globe',
          serviceTypeName: listing.service_type?.name || '',
          price: listing.base_price,
          duration: listing.duration,
          providerId: listing.provider_id,
          providerName: listing.provider?.name || 'Proveedor',
          providerRating: listing.provider?.average_rating || null,
          experienceYears: listing.provider?.experience_years || 0,
          hasCertifications,
          residenciaIds: [residenciaId],
          createdAt: new Date(listing.created_at),
          serviceVariants: listing.service_variants 
            ? JSON.parse(listing.service_variants) 
            : []
        };
      });
    }
  });

  // NEW CODE: Group listings by category
  const listingsByCategory = React.useMemo(() => {
    const filtered = listings.filter(listing => 
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.providerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      if (sortBy === 'rating') return (b.providerRating || 0) - (a.providerRating || 0);
      // Default is recommended/featured
      return b.experienceYears - a.experienceYears;
    });
    
    const grouped: Record<string, typeof listings> = {};
    
    sorted.forEach(listing => {
      const categoryId = listing.categoryId || 'other';
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(listing);
    });
    
    return grouped;
  }, [listings, searchTerm, sortBy]);

  // Calculate final price with commission
  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * (1 + (commissionRate / 100));
  };

  const handleBookService = (providerId: string, serviceId: string) => {
    navigate(`/client/service/${providerId}/${serviceId}`);
  };

  const handleContactProvider = (providerId: string, providerName: string) => {
    startNewConversation(providerId, providerName);
    navigate('/client/messages');
  };

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = SERVICE_CATEGORIES[iconName as keyof typeof SERVICE_CATEGORIES]?.icon;
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null;
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Servicios"
        subtitle="Explorando servicios disponibles..."
      >
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-2/3">
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="w-full md:w-1/3">
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
        
        <div className="grid gap-8">
          {[1, 2].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-[280px] rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    );
  }

  const CategoryTitle = categoryId ? 
    SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.label || "Servicios" : 
    "Todos los servicios";

  return (
    <PageContainer
      title={CategoryTitle}
      subtitle={categoryId ? "Servicios disponibles en esta categoría" : "Explora todos los servicios disponibles"}
    >
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-2/3">
            <Input
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          
          <div className="w-full md:w-1/3">
            <Select defaultValue={sortBy} onValueChange={(value) => setSortBy(value)}>
              <SelectTrigger className="w-full">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Ordenar por" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recomendados</SelectItem>
                <SelectItem value="rating">Mejor valorados</SelectItem>
                <SelectItem value="price-low">Precio: Más bajo primero</SelectItem>
                <SelectItem value="price-high">Precio: Más alto primero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {Object.keys(listingsByCategory).length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No se encontraron resultados para "{searchTerm}"</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setSearchTerm('')}
            >
              Limpiar búsqueda
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-12 animate-fade-in">
        {Object.entries(listingsByCategory).map(([categoryId, categoryListings]) => {
          const CategoryIcon = SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.icon;
          
          return (
            <section key={categoryId} className="space-y-6">
              <div className="flex items-center space-x-4">
                <h2 
                  className="text-2xl font-semibold flex items-center gap-2" 
                  style={{ color: SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.color || '#333' }}
                >
                  {CategoryIcon && <CategoryIcon className="h-5 w-5" />}
                  <span>{SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.label || 'Otros servicios'}</span>
                </h2>
                <div className="h-[2px] flex-1" style={{ 
                  background: SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.color || '#e5e7eb',
                  opacity: 0.3 
                }} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryListings.map(listing => (
                  <Card 
                    key={listing.id} 
                    className="group hover:shadow-lg transition-all duration-300 border-t-4 overflow-hidden"
                    style={{ 
                      borderTopColor: SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.color || '#333'
                    }}
                  >
                    <CardContent className="p-0">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={undefined} alt={listing.providerName} />
                            <AvatarFallback>
                              {listing.providerName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex gap-1 items-center">
                            {listing.providerRating && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                ★ {listing.providerRating.toFixed(1)}
                              </Badge>
                            )}
                            {listing.hasCertifications && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Certificado
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                            {listing.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {listing.description}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Por: <span className="font-medium text-foreground">{listing.providerName}</span>
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                              Duración: <span className="font-medium text-foreground">{listing.duration} min</span>
                            </div>
                            <div className="text-lg font-semibold">
                              ${calculateFinalPrice(listing.price).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center p-4 space-x-3">
                        <Button
                          className="flex-1"
                          onClick={() => handleBookService(listing.providerId, listing.id)}
                        >
                          Reservar
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleContactProvider(listing.providerId, listing.providerName)}
                          title="Contactar proveedor"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
        
        {listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay servicios disponibles en esta categoría todavía.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => navigate('/client')}
            >
              Explorar todas las categorías
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientServices;
