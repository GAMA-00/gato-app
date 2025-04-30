
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Scissors, PawPrint, Dumbbell, Book, Heart, Music, Globe } from 'lucide-react';

// Mapeo de iconos por categoría
const categoryIcons: Record<string, React.ReactNode> = {
  'home': <Home size={32} />,
  'personal-care': <Scissors size={32} />,
  'pets': <PawPrint size={32} />,
  'sports': <Dumbbell size={32} />,
  'classes': <Book size={32} />,
  'health': <Heart size={32} />,
  'music': <Music size={32} />,
  'languages': <Globe size={32} />,
};

// Mapeo de categorías a sus servicios
const categoryServices: Record<string, {id: string, name: string, description: string}[]> = {
  'home': [
    { id: '1', name: 'Limpieza de hogar', description: 'Servicio de limpieza completa para tu hogar' },
    { id: '2', name: 'Plomería', description: 'Servicios de plomería y reparación' },
    { id: '3', name: 'Electricidad', description: 'Instalaciones y reparaciones eléctricas' },
    { id: '4', name: 'Jardinería', description: 'Cuidado y mantenimiento de jardines' }
  ],
  'pets': [
    { id: '1', name: 'Paseo de mascotas', description: 'Servicio de paseo para perros' },
    { id: '2', name: 'Peluquería canina', description: 'Corte y baño para tu mascota' },
    { id: '3', name: 'Cuidado a domicilio', description: 'Cuidamos a tu mascota en tu hogar' }
  ],
  // Otros servicios por categoría
  'personal-care': [
    { id: '1', name: 'Corte de cabello', description: 'Servicios de peluquería' },
    { id: '2', name: 'Manicure', description: 'Cuidado de uñas y manos' }
  ],
  'sports': [
    { id: '1', name: 'Entrenador personal', description: 'Entrenamiento personalizado' },
    { id: '2', name: 'Yoga', description: 'Clases individuales de yoga' }
  ],
  'classes': [
    { id: '1', name: 'Matemáticas', description: 'Clases particulares de matemáticas' },
    { id: '2', name: 'Física', description: 'Tutorías en física y ciencias' }
  ],
  'health': [
    { id: '1', name: 'Masajes', description: 'Servicio de masajes terapéuticos' },
    { id: '2', name: 'Nutrición', description: 'Asesoría en nutrición y alimentación' }
  ],
  'music': [
    { id: '1', name: 'Piano', description: 'Clases de piano' },
    { id: '2', name: 'Guitarra', description: 'Aprende a tocar guitarra' }
  ],
  'languages': [
    { id: '1', name: 'Inglés', description: 'Clases particulares de inglés' },
    { id: '2', name: 'Español', description: 'Aprende español con profesores nativos' }
  ],
};

// Mapeo de etiquetas para categorías
const categoryLabels: Record<string, string> = {
  'home': 'Hogar',
  'personal-care': 'Cuidado Personal',
  'pets': 'Mascotas',
  'sports': 'Deportes',
  'classes': 'Clases',
  'health': 'Salud',
  'music': 'Música',
  'languages': 'Idiomas'
};

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  
  // Obtener los servicios según la categoría
  const services = categoryName ? categoryServices[categoryName] || [] : [];
  const categoryLabel = categoryName ? categoryLabels[categoryName] || categoryName : '';
  const categoryIcon = categoryName ? categoryIcons[categoryName] : null;

  // Manejar la selección de un servicio
  const handleServiceSelect = (serviceId: string) => {
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };

  // Volver a la página de categorías
  const handleBack = () => {
    navigate('/client');
  };

  return (
    <PageContainer
      title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy">
            {categoryIcon}
          </div>
          <span>Servicios de {categoryLabel}</span>
        </div>
      }
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a categorías</span>
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
        {services.map((service) => (
          <Card 
            key={service.id}
            className="p-6 hover:shadow-luxury transition-all cursor-pointer bg-luxury-white border-luxury-gray"
            onClick={() => handleServiceSelect(service.id)}
          >
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-luxury-beige text-luxury-navy mb-4">
                {categoryIcon}
              </div>
              <h3 className="font-medium text-center">{service.name}</h3>
              <p className="text-sm text-center text-muted-foreground mt-2">{service.description}</p>
            </div>
          </Card>
        ))}
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
        </div>
      )}
    </PageContainer>
  );
};

export default ClientCategoryDetails;
