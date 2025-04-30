
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Home, Scissors, PawPrint, Dumbbell, Book, Heart, Music, Globe } from 'lucide-react';

interface ServiceCategory {
  id: string;
  name: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const categories: ServiceCategory[] = [
  {
    id: '1',
    name: 'home',
    label: 'Hogar',
    icon: <Home size={32} />,
    description: 'Servicios para el cuidado de tu hogar'
  },
  {
    id: '2',
    name: 'personal-care',
    label: 'Cuidado Personal',
    icon: <Scissors size={32} />,
    description: 'Servicios de cuidado personal'
  },
  {
    id: '3',
    name: 'pets',
    label: 'Mascotas',
    icon: <PawPrint size={32} />,
    description: 'Servicios para el cuidado de tus mascotas'
  },
  {
    id: '4',
    name: 'sports',
    label: 'Deportes',
    icon: <Dumbbell size={32} />,
    description: 'Servicios relacionados con deporte y fitness'
  },
  {
    id: '5',
    name: 'classes',
    label: 'Clases',
    icon: <Book size={32} />,
    description: 'Clases particulares y grupales'
  },
  {
    id: '6',
    name: 'health',
    label: 'Salud',
    icon: <Heart size={32} />,
    description: 'Servicios relacionados con tu bienestar'
  },
  {
    id: '7',
    name: 'music',
    label: 'Música',
    icon: <Music size={32} />,
    description: 'Servicios musicales y de entretenimiento'
  },
  {
    id: '8',
    name: 'languages',
    label: 'Idiomas',
    icon: <Globe size={32} />,
    description: 'Servicios de aprendizaje y práctica de idiomas'
  },
];

const ClientCategoryView = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  return (
    <PageContainer
      title="Explora nuestras categorías de servicio"
      subtitle="Selecciona una categoría para ver los servicios disponibles"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
        {categories.map((category) => (
          <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
            <Card className="flex flex-col items-center p-6 hover:shadow-luxury transition-shadow cursor-pointer bg-luxury-white">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-4">
                {category.icon}
              </div>
              <h3 className="text-center font-medium">{category.label}</h3>
              <p className="text-xs text-center text-muted-foreground mt-1">{category.description}</p>
            </Card>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;
