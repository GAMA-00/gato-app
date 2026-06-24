import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hooks PÚBLICOS para el booking link (gato.app/{slug}) — sin autenticación.
 * Ver docs/CONCEPTO_V1.md §7 y SKILL_CANTONES_GEO.md
 */
const db = supabase as any;

export interface PublicProvider {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  about_me: string | null;
  experience_years: number | null;
  average_rating: number | null;
  canton_base_id: number | null;
}

export interface PublicListing {
  id: string;
  title: string;
  description: string | null;
  base_price: number | null;
  duration: number | null;
}

/** Resuelve el proveedor por slug vía RPC seguro (get_provider_by_slug). */
export function usePublicProvider(slug?: string) {
  return useQuery({
    queryKey: ["public-provider", slug],
    enabled: !!slug,
    queryFn: async (): Promise<PublicProvider | null> => {
      const { data, error } = await db.rpc("get_provider_by_slug", { p_slug: slug });
      if (error) throw error;
      return (data?.[0] as PublicProvider) ?? null;
    },
  });
}

/** Servicios activos del proveedor (listings con lectura pública). */
export function usePublicListings(providerId?: string) {
  return useQuery({
    queryKey: ["public-listings", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<PublicListing[]> => {
      const { data, error } = await db
        .from("listings")
        .select("id, title, description, base_price, duration")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Cantones donde trabaja el proveedor (lectura pública). */
export function usePublicProviderCantones(providerId?: string) {
  return useQuery({
    queryKey: ["public-provider-cantones", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<number[]> => {
      const { data, error } = await db
        .from("provider_cantones")
        .select("canton_id, accepts_requests")
        .eq("provider_id", providerId);
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.accepts_requests !== false)
        .map((r: any) => r.canton_id);
    },
  });
}
