// Orden prioritario por categoría (nombres de service types que deben aparecer primero)
export const serviceTypeOrderByCategory: Record<string, string[]> = {
  'home': [
    'Chef privado',
    'Hidrolavado (ventanas, fachadas, aceras)',
    'Fumigación',
    'Floristería',
  ],
  'personal-care': [
    'Manicurista',
  ],
  'sports': [
    'Yoga',
    'Entrenador personal',
  ],
  'classes': [
    'Tutorías',
  ],
  'pets': [],
  'other': [],
};

// Categorías que no deben reordenarse
export const categoriesWithoutReorder: string[] = ['pets', 'other'];
