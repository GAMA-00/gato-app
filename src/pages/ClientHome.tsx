
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Home, 
  Scissors, 
  PawPrint, 
  Dumbbell, 
  Book, 
  ArrowRight 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const CATEGORIES = [
  { 
    id: 'home', 
    title: 'Hogar', 
    icon: Home 
  },
  { 
    id: 'personal-care', 
    title: 'Cuidado Personal', 
    icon: Scissors 
  },
  { 
    id: 'pets', 
    title: 'Mascotas', 
    icon: PawPrint 
  },
  { 
    id: 'sports', 
    title: 'Deportes', 
    icon: Dumbbell 
  },
  { 
    id: 'classes', 
    title: 'Clases', 
    icon: Book 
  }
];

const ClientHome = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6">Servicios</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => (
          <Card 
            key={category.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/client/services/${category.id}`)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <category.icon className="h-6 w-6 text-primary" />
                <span className="font-medium">{category.title}</span>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ClientHome;
