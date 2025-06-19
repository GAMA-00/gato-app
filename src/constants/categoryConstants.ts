
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

// URLs de imágenes para preload estratégico
export const categoryImageUrls: Record<string, string> = {
  'home': '/lovable-uploads/11446302-74b0-4775-bc77-01fbf112f8f0.png',
  'pets': '/lovable-uploads/7613f29b-5528-4db5-9357-1d3724a98d5d.png',
  'classes': '/lovable-uploads/19672ce3-748b-4ea7-86dc-b281bb9b8d45.png',
  'personal-care': '/lovable-uploads/f5cf3911-b44f-47e9-b52e-4e16ab8b8987.png',
  'sports': '/lovable-uploads/44391171-f4e7-4ef6-8866-864fdade5d3c.png',
  'other': '/lovable-uploads/65de903f-70f1-4130-87f0-8152a49381fe.png',
};
