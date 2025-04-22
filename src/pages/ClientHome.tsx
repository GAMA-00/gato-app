
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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from '@/components/ui/select';
import { MOCK_SERVICES } from '@/lib/data';
import { useAuth } from '@/contexts/AuthContext';

// Main categories and associated icons
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

// Simulated available residences
const AVAILABLE_RESIDENCES = [
  { id: '1', name: 'Residencia Los Robles' },
  { id: '2', name: 'Residencial Oasis' },
  { id: '3', name: 'Condo Villa Sur' }
];

const LOCAL_STORAGE_KEY = 'gato_selected_residence';

const ClientHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedResidence, setSelectedResidence] = useState<string>('');
  // Track open dropdown by category id
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Load initial residence selection
  useEffect(() => {
    let initialResidenceId = '';
    if (user && user.buildingId) {
      initialResidenceId = user.buildingId;
    } else {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) initialResidenceId = saved;
    }
    if (!initialResidenceId && AVAILABLE_RESIDENCES.length > 0) {
      initialResidenceId = AVAILABLE_RESIDENCES[0].id;
    }
    setSelectedResidence(initialResidenceId);
  }, [user]);

  useEffect(() => {
    if (selectedResidence) {
      localStorage.setItem(LOCAL_STORAGE_KEY, selectedResidence);
    }
  }, [selectedResidence]);

  const selectedResidenceObj = AVAILABLE_RESIDENCES.find(
    r => r.id === selectedResidence
  );

  // List services for a category & selected residence
  function getServicesByCategory(categoryId: string) {
    if (!selectedResidence) return [];
    return MOCK_SERVICES.filter(
      s => s.buildingIds.includes(selectedResidence) && s.category === categoryId
    );
  }

  // Handles toggling the dropdown for categories
  const handleCategoryClick = (categoryId: string) => {
    setOpenDropdown(prev => (prev === categoryId ? null : categoryId));
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-md mb-2">
        <Select
          value={selectedResidence}
          onValueChange={value => setSelectedResidence(value)}
        >
          <SelectTrigger className="mb-2">
            <SelectValue placeholder="Selecciona tu residencia" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_RESIDENCES.map(r => (
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
        {CATEGORIES.map(category => {
          const CategoryIcon = category.icon;
          const services = getServicesByCategory(category.id);
          return (
            <Card key={category.id} className="p-0">
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  className="w-full justify-between text-left rounded-none p-4 border-b font-medium"
                  onClick={() => handleCategoryClick(category.id)}
                  aria-expanded={openDropdown === category.id}
                  aria-controls={`dropdown-${category.id}`}
                >
                  <span className="flex items-center gap-3">
                    <CategoryIcon className="h-6 w-6 text-primary" />
                    {category.title}
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Button>
                {openDropdown === category.id && (
                  <div
                    className="bg-background z-50 p-2 animate-fade-in"
                    id={`dropdown-${category.id}`}
                  >
                    {services.length > 0 ? (
                      <ul>
                        {services.map(service => (
                          <li key={service.id}>
                            <Button
                              variant="ghost"
                              className="w-full justify-between px-3 py-2 rounded text-left"
                              onClick={() =>
                                navigate(
                                  `/client/services/${category.id}/${encodeURIComponent(
                                    service.name
                                  )}`
                                )
                              }
                            >
                              <span>{service.name}</span>
                              <ArrowRight className="h-4 w-4 text-primary ml-2" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        Aun no hay proveedores en este servicio
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ClientHome;
