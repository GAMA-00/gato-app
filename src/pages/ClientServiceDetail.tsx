
import React, { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, DollarSign, Calendar, Star, BadgeCheck, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProviderData } from '@/components/client/results/types';

// Define interfaces for our data structures
interface ServiceTypeData {
  name: string;
  category?: {
    name: string;
  };
}

interface ClientResidencia {
  name: string;
  address: string;
}

interface ServiceDetailData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  is_active: boolean;
  provider: ProviderData;
  service_type: ServiceTypeData;
  clientResidencia?: ClientResidencia | null;
  recurringClients?: number;
}

const ClientServiceDetail = () => {
  const { providerId, serviceId } = useParams<{ providerId: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state?.bookingData || {};
  const { user } = useAuth();
  
  // Fetch provider and service details
  const { data: serviceDetails, isLoading } = useQuery({
    queryKey: ['service-detail', serviceId, providerId],
    queryFn: async () => {
      if (!serviceId || !providerId) return null;
      
      // Get listing details
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files,
            email,
            phone
          ),
          service_type:service_type_id(
            name,
            category:category_id(
              name
            )
          )
        `)
        .eq('id', serviceId)
        .eq('provider_id', providerId)
        .single();
        
      if (error) {
        console.error("Error fetching service details:", error);
        toast.error("Error al obtener detalles del servicio");
        throw error;
      }
      
      // Get client residence info
      let clientResidencia = null;
      if (user?.id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('residencia_id, residencias(name, address)')
          .eq('id', user.id)
          .maybeSingle();
          
        clientResidencia = clientData?.residencias;
      }
      
      // Mock data for recurring clients
      const recurringClients = Math.floor(Math.random() * 10);
      
      // Process provider data to include hasCertifications
      const providerData = listing.provider as ProviderData || {};
      const hasCertifications = providerData.certification_files && 
                               Array.isArray(providerData.certification_files) && 
                               providerData.certification_files.length > 0;
      
      return {
        ...listing,
        provider: {
          ...providerData,
          hasCertifications
        },
        clientResidencia,
        recurringClients
      } as ServiceDetailData;
    },
    enabled: !!serviceId && !!providerId
  });
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleSchedule = () => {
    toast.success("¡Servicio agendado con éxito!");
    navigate('/client/booking-summary', {
      state: {
        provider: serviceDetails?.provider,
        service: {
          id: serviceDetails?.id,
          name: serviceDetails?.title,
          price: serviceDetails?.base_price,
          duration: serviceDetails?.duration
        },
        bookingData
      }
    });
  };
  
  if (isLoading) {
    return (
      <PageContainer
        title="Cargando detalles..."
        subtitle={
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Volver</span>
          </Button>
        }
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </PageContainer>
    );
  }
  
  if (!serviceDetails) {
    return (
      <PageContainer
        title="Servicio no encontrado"
        subtitle={
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Volver</span>
          </Button>
        }
      >
        <div className="text-center py-12">
          <p className="text-muted-foreground">No pudimos encontrar los detalles de este servicio.</p>
        </div>
      </PageContainer>
    );
  }
  
  // Safely access nested properties
  const provider = serviceDetails?.provider || {};
  const serviceType = serviceDetails?.service_type || { name: '', category: { name: '' } };
  const category = serviceType.category || { name: '' };
  
  return (
    <PageContainer
      title={serviceDetails.title}
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a resultados</span>
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Service Image */}
        <div className="h-64 w-full rounded-lg overflow-hidden bg-gray-100">
          <img 
            src="https://placehold.co/1200x600?text=Servicio&font=montserrat" 
            alt={serviceDetails.title} 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Service Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{serviceDetails.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge>{category.name}</Badge>
              <Badge variant="outline">{serviceType.name}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${serviceDetails.base_price.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground flex items-center justify-end mt-1">
              <Clock className="h-4 w-4 mr-1" />
              {Math.floor(serviceDetails.duration / 60) > 0 ? `${Math.floor(serviceDetails.duration / 60)}h ` : ''}
              {serviceDetails.duration % 60 > 0 ? `${serviceDetails.duration % 60}min` : ''}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Service Description */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-2">Descripción del servicio</h3>
            <p className="text-muted-foreground whitespace-pre-line">
              {serviceDetails.description}
            </p>
          </CardContent>
        </Card>
        
        {/* Provider Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start">
              <Avatar className="h-16 w-16">
                <AvatarImage src={undefined} alt={provider.name} />
                <AvatarFallback>
                  {provider.name?.substring(0, 2).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              
              <div className="ml-4">
                <h3 className="text-lg font-semibold">{provider.name}</h3>
                
                <div className="flex items-center mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium">{provider.average_rating?.toFixed(1) || "Nuevo"}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {provider.hasCertifications && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      Certificado
                    </Badge>
                  )}
                  
                  {serviceDetails.recurringClients > 0 && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {serviceDetails.recurringClients} clientes recurrentes
                    </Badge>
                  )}
                  
                  {serviceDetails.clientResidencia && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {serviceDetails.clientResidencia.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {provider.about_me && (
              <div className="mt-4">
                <h4 className="font-medium mb-1">Sobre el profesional</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{provider.about_me}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Schedule Button */}
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">¿Listo para agendar este servicio?</h3>
              <p className="text-muted-foreground mb-4">Haz clic en el botón a continuación para programar tu cita.</p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 flex justify-center">
            <Button onClick={handleSchedule} size="lg" className="w-full md:w-auto md:px-12 bg-luxury-navy text-white">
              <Calendar className="mr-2" />
              Agendar servicio
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
};

export default ClientServiceDetail;
