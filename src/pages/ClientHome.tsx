
import React, { useState, useEffect } from 'react';
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { MOCK_SERVICES } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';

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

// Simulación de residencias del usuario (en producción, obtener desde user/building/backend)
const AVAILABLE_RESIDENCES = [
  { id: 'res1', name: 'Residencia Los Robles' },
  { id: 'res2', name: 'Residencial Oasis' },
  { id: 'res3', name: 'Condo Villa Sur' }
];

const LOCAL_STORAGE_KEY = 'gato_selected_residence';

const ClientHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedResidence, setSelectedResidence] = useState<string | null>(null);

  // Cargar residencia seleccionada (desde usuario o localStorage)
  useEffect(() => {
    let initialResidenceId = null;
    if (user && user.buildingId) {
      initialResidenceId = user.buildingId;
    } else {
      initialResidenceId = localStorage.getItem(LOCAL_STORAGE_KEY);
    }
    // Si no existe, usar la primera opción como fallback
    if (!initialResidenceId && AVAILABLE_RESIDENCES.length > 0) {
      initialResidenceId = AVAILABLE_RESIDENCES[0].id;
    }
    setSelectedResidence(initialResidenceId);
  }, [user]);

  // Cuando cambia, guardamos para próximas visitas
  useEffect(() => {
    if (selectedResidence) {
      localStorage.setItem(LOCAL_STORAGE_KEY, selectedResidence);
    }
  }, [selectedResidence]);

  // Obtener nombre de residencia seleccionada
  const selectedResidenceObj = AVAILABLE_RESIDENCES.find(r => r.id === selectedResidence);

  // Obtener servicios disponibles por categoría y residencia
  function getServicesByCategory(categoryId: string) {
    // Filtrar por residencia
    if (!selectedResidence) return [];
    // Suponemos que MOCK_SERVICES tiene el campo buildingIds (plural) y category
    return MOCK_SERVICES.filter(
      s => s.buildingIds.includes(selectedResidence) && s.category === categoryId
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-md mb-2">
        <Select
          value={selectedResidence ?? ''}
          onValueChange={(value) => setSelectedResidence(value)}
        >
          <SelectTrigger className="mb-2">
            <SelectValue placeholder="Selecciona tu residencia" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_RESIDENCES.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold mb-6">
        Servicios
        {selectedResidenceObj && (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {selectedResidenceObj.name}
          </span>
        )}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => {
          const services = getServicesByCategory(category.id);
          return (
            <Card 
              key={category.id} 
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3 mb-2">
                  <category.icon className="h-6 w-6 text-primary" />
                  <span className="font-medium">{category.title}</span>
                </div>
                {services.length > 0 ? (
                  <Select
                    onValueChange={(serviceId) => {
                      navigate(`/client/book/${selectedResidence}/${serviceId}`);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          <span className="flex items-center gap-2">
                            {service.name}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="py-3 text-center text-sm text-muted-foreground">
                    Aun no hay proveedores en este servicio
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  );
};

export default ClientHome;
