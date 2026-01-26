// Gradient colors for category hero headers
export const categoryGradients: Record<string, string> = {
  'home': 'from-[#F5EDE8] to-[#E8DED6]',           // Beige suave (casita)
  'pets': 'from-[#FFCCC5] to-[#FFB4AA]',           // Coral/salmon (gatito)
  'classes': 'from-[#FFE4C4] to-[#FFD4A8]',        // Naranja claro (libros)
  'personal-care': 'from-[#D4E5F7] to-[#C4D9EF]',  // Azul claro (secadora)
  'sports': 'from-[#E5E5E5] to-[#D5D5D5]',         // Gris (pesas)
  'other': 'from-[#E8F4EC] to-[#D8E8DF]',          // Verde claro (mundo)
};

// Text colors for better contrast on each gradient
export const categoryTextColors: Record<string, string> = {
  'home': 'text-[#5D4E42]',
  'pets': 'text-[#8B4A42]',
  'classes': 'text-[#7A5A3A]',
  'personal-care': 'text-[#3A5A7A]',
  'sports': 'text-[#4A4A4A]',
  'other': 'text-[#3A5A4A]',
};
