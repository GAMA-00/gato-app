
import React from 'react';
import { Shield, Star, Award, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProviderExperienceLevelProps {
  experienceYears: number;
  className?: string;
}

const ProviderExperienceLevel = ({ experienceYears, className }: ProviderExperienceLevelProps) => {
  // Determine experience level based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return { name: 'Principiante', color: 'bg-gray-100 text-gray-700', icon: <User className="h-3 w-3" /> };
    if (years < 3) return { name: 'Confiable', color: 'bg-blue-100 text-blue-700', icon: <Shield className="h-3 w-3" /> };
    if (years < 5) return { name: 'Recomendado', color: 'bg-amber-100 text-amber-700', icon: <Star className="h-3 w-3" /> };
    return { name: 'Experto', color: 'bg-green-100 text-green-700', icon: <Award className="h-3 w-3" /> };
  };

  const level = getExperienceLevel(experienceYears);

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${level.color} ${className || ''}`}>
      {level.icon}
      {level.name}
    </Badge>
  );
};

export default ProviderExperienceLevel;
