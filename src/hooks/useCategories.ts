
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      
      if (categoriesError) throw categoriesError;

      // Fetch service types
      const { data: serviceTypes, error: serviceTypesError } = await supabase
        .from('service_types')
        .select('*')
        .order('name');
      
      if (serviceTypesError) throw serviceTypesError;

      // Group service types by category
      const serviceTypesByCategory = serviceTypes.reduce((acc, type) => {
        if (!acc[type.category_id]) {
          acc[type.category_id] = [];
        }
        acc[type.category_id].push(type);
        return acc;
      }, {} as Record<string, any[]>);

      return {
        categories,
        serviceTypesByCategory
      };
    }
  });
}
