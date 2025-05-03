
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, FileText, ShieldCheck, CalendarDays } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
}

const ProviderAchievements = ({ provider }: ProviderAchievementsProps) => {
  // Determinar el nivel basado en la experiencia
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 'Principiante';
    if (years < 3) return 'Confiable';
    if (years < 5) return 'Recomendado';
    return 'Experto';
  };

  const experienceLevel = getExperienceLevel(provider.experienceYears);
  
  // Métricas del proveedor
  const achievements = [
    {
      icon: <Award className="h-6 w-6 text-luxury-navy" />,
      label: 'Profesional',
      value: experienceLevel
    },
    {
      icon: <FileText className="h-6 w-6 text-luxury-navy" />,
      label: 'Servicios realizados',
      value: provider.servicesCompleted.toString()
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-luxury-navy" />,
      label: 'Perfil verificado',
      value: provider.isVerified ? 'Sí' : 'No'
    },
    {
      icon: <CalendarDays className="h-6 w-6 text-luxury-navy" />,
      label: 'Fecha de ingreso',
      value: format(provider.joinDate, 'MMMM yyyy', { locale: es })
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Méritos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center space-y-2 p-2">
              <div className="w-12 h-12 rounded-full bg-luxury-beige flex items-center justify-center">
                {item.icon}
              </div>
              <Badge variant="outline" className="font-normal">{item.label}</Badge>
              <p className="font-medium">{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;
