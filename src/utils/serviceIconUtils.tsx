
import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
  homeServiceImages,
  petsServiceImages,
  classesServiceImages,
  personalCareServiceImages,
  sportsServiceImages,
  otherServiceImages
} from '@/constants/serviceImages';

export interface ServiceIcon {
  type: 'image' | 'icon';
  src?: string;
  component?: React.ComponentType<{ className?: string }>;
}

export const getServiceTypeIcon = (serviceName: string, categoryId: string): ServiceIcon => {
  const normalizedName = serviceName.toLowerCase();
  
  // Check category-specific images
  const categoryImageMaps = {
    'home': homeServiceImages,
    'pets': petsServiceImages,
    'classes': classesServiceImages,
    'personal-care': personalCareServiceImages,
    'sports': sportsServiceImages,
    'other': otherServiceImages,
  };

  // Search category-specific map first, then fall back to all maps
  const mapsToSearch = [
    categoryImageMaps[categoryId as keyof typeof categoryImageMaps],
    ...Object.values(categoryImageMaps).filter(m => m !== categoryImageMaps[categoryId as keyof typeof categoryImageMaps]),
  ].filter(Boolean);

  for (const imageMap of mapsToSearch) {
    for (const [key, imagePath] of Object.entries(imageMap)) {
      if (normalizedName.includes(key)) {
        return { type: 'image', src: imagePath };
      }
    }
  }
  
  // Fallback to Lucide icons for services without custom images
  if (normalizedName.includes('limpieza')) {
    return { type: 'icon', component: LucideIcons.Sparkles };
  } else if (normalizedName.includes('planchado')) {
    return { type: 'icon', component: LucideIcons.Shirt };
  } else if (normalizedName.includes('jardin') || normalizedName.includes('jardinería')) {
    return { type: 'icon', component: LucideIcons.Trees };
  } else if (normalizedName.includes('mantenimiento')) {
    return { type: 'icon', component: LucideIcons.Wrench };
  } else if (normalizedName.includes('chef') || normalizedName.includes('cocin')) {
    return { type: 'icon', component: LucideIcons.ChefHat };
  } else if (normalizedName.includes('lavacar') || normalizedName.includes('lava') || normalizedName.includes('carro') || normalizedName.includes('auto')) {
    return { type: 'icon', component: LucideIcons.Car };
  } else if (normalizedName.includes('belleza') || normalizedName.includes('manicur') || normalizedName.includes('pedicur') || normalizedName.includes('estetica')) {
    return { type: 'icon', component: LucideIcons.Scissors };
  } else if (normalizedName.includes('masaje') || normalizedName.includes('fisio') || normalizedName.includes('terapia')) {
    return { type: 'icon', component: LucideIcons.Heart };
  } else if (normalizedName.includes('paseo') || normalizedName.includes('mascota') || normalizedName.includes('perro') || normalizedName.includes('gato')) {
    return { type: 'icon', component: LucideIcons.PawPrint };
  } else if (normalizedName.includes('clase') || normalizedName.includes('tutor') || normalizedName.includes('enseñ')) {
    return { type: 'icon', component: LucideIcons.BookOpen };
  } else if (normalizedName.includes('deporte') || normalizedName.includes('entrena') || normalizedName.includes('gym')) {
    return { type: 'icon', component: LucideIcons.Dumbbell };
  }

  // Default fallback icon
  return { type: 'icon', component: LucideIcons.Briefcase };
};
