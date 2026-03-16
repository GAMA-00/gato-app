
import categoryHomeImg from '@/assets/category-home.png';
import categoryPetsImg from '@/assets/category-pets.png';
import categoryClassesImg from '@/assets/category-classes.png';
import categoryPersonalCareImg from '@/assets/category-personal-care.png';
import categorySportsImg from '@/assets/category-sports.png';
import categoryOtherImg from '@/assets/category-other.png';

// Mapa de iconos específico para cada categoría
export const iconMap: Record<string, 'custom-home' | 'custom-pets' | 'custom-classes' | 'custom-personal-care' | 'custom-sports' | 'custom-other'> = {
  'classes': 'custom-classes',
  'personal-care': 'custom-personal-care',
  'sports': 'custom-sports',
  'home': 'custom-home',
  'pets': 'custom-pets',
  'other': 'custom-other',
};

// Nombres de categorías en español
export const categoryLabels: Record<string, string> = {
  'classes': 'Clases',
  'personal-care': 'Cuidado Personal',
  'sports': 'Deportes',
  'home': 'Hogar',
  'pets': 'Mascotas',
  'other': 'Otros',
};

// Nuevo orden específico para las categorías
export const categoryOrder = ['home', 'pets', 'classes', 'personal-care', 'sports', 'other'];

// Imágenes de categoría importadas desde assets
export const categoryImages: Record<string, string> = {
  'home': categoryHomeImg,
  'pets': categoryPetsImg,
  'classes': categoryClassesImg,
  'personal-care': categoryPersonalCareImg,
  'sports': categorySportsImg,
  'other': categoryOtherImg,
};

// URLs de imágenes para preload estratégico (legacy, kept for compatibility)
export const categoryImageUrls: Record<string, string> = categoryImages;
