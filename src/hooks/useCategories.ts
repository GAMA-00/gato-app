
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  label: string;
  icon: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  label: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;

      // Fetch subcategories
      const { data: subcategories, error: subcategoriesError } = await supabase
        .from('subcategories')
        .select('*')
        .order('name');
      
      if (subcategoriesError) throw subcategoriesError;

      // Group subcategories by category
      const subcategoriesByCategory = subcategories.reduce((acc, sub) => {
        if (!acc[sub.category_id]) {
          acc[sub.category_id] = [];
        }
        acc[sub.category_id].push(sub);
        return acc;
      }, {} as Record<string, Subcategory[]>);

      return {
        categories,
        subcategoriesByCategory
      };
    }
  });
}
