
import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, Calendar, Clock, CheckCircle, Badge as BadgeIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface Professional {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  completedServices: number;
  tags: string[];
  images: string[];
  minPrice: number;
}

// Datos de ejemplo para profesionales
const mockProfessionals: Professional[] = [
  {
    id: '1',
    name: 'Laura Martínez',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    rating: 4.8,
    completedServices: 124,
    tags: ['Agenda actualizada', 'Clientes recurrentes'],
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
      'https://images.unsplash.com/photo-1444212477490-ca407925329e'
    ],
    minPrice: 30
  },
  {
    id: '2',
    name: 'Carlos Sánchez',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    rating: 4.7,
    completedServices: 97,
    tags: ['Perfil de empresa', 'Agenda actualizada'],
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb'
    ],
    minPrice: 35
  },
  {
    id: '3',
    name: 'Elena Gutiérrez',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    rating: 4.9,
    completedServices: 215,
    tags: ['Clientes recurrentes', 'Perfil verificado'],
    images: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb',
      'https://images.unsplash.com/photo-1444212477490-ca407925329e'
    ],
    minPrice: 40
  }
];

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Extraer los datos de la reserva pasados por location state
  const bookingDetails = location.state || {
    frequency: 'once',
    selectedDays: [],
    duration: 60,
    timePreference: 'flexible',
    timeSlot: ''
  };

  // Manejar la selección de un profesional
  const handleSelectProfessional = (professionalId: string) => {
    navigate(`/client/confirmation/${categoryName}/${serviceId}/${professionalId}`, {
      state: { ...bookingDetails }
    });
  };

  // Volver a la pantalla de reserva
  const handleBack = () => {
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };

  // Función para mostrar las estrellas según la calificación
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} size={16} className="fill-luxury-navy text-luxury-navy" />);
    }
    
    if (halfStar) {
      stars.push(<Star key="half" size={16} className="fill-luxury-navy text-luxury-navy" />);
    }
    
    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} size={16} className="text-luxury-gray" />);
    }
    
    return stars;
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
      <div className="space-y-8 animate-fade-in">
        {mockProfessionals.map((professional) => (
          <Card key={professional.id} className="overflow-hidden bg-luxury-white shadow-luxury">
            <div className="p-6">
              {/* Información del profesional */}
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16 border-2 border-luxury-gray">
                  <AvatarImage src={professional.avatar} alt={professional.name} />
                  <AvatarFallback>{professional.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{professional.name}</h3>
                  <div className="flex items-center mt-1">
                    {renderStars(professional.rating)}
                    <span className="ml-1 text-sm text-muted-foreground">({professional.rating})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {professional.completedServices} servicios completados
                  </p>
                </div>
              </div>
              
              {/* Tags del profesional */}
              <div className="flex flex-wrap gap-2 mb-4">
                {professional.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="bg-luxury-beige text-luxury-navy border-none">
                    <CheckCircle size={12} className="mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              
              {/* Galería de imágenes */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Trabajos anteriores</h4>
                <Carousel className="w-full">
                  <CarouselContent>
                    {professional.images.map((image, index) => (
                      <CarouselItem key={index} className="basis-1/3">
                        <div className="p-1">
                          <div className="aspect-square rounded-md overflow-hidden">
                            <img 
                              src={image} 
                              alt={`Trabajo ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious />
                  <CarouselNext />
                </Carousel>
              </div>
              
              {/* Precio y botón de reserva */}
              <div className="flex items-center justify-between mt-6">
                <div>
                  <p className="text-sm text-muted-foreground">Precio desde:</p>
                  <p className="text-xl font-medium text-luxury-navy">${professional.minPrice}/h</p>
                </div>
                <Button 
                  onClick={() => handleSelectProfessional(professional.id)}
                  className="bg-luxury-navy hover:bg-luxury-navy/90"
                >
                  Seleccionar
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientResultsView;
