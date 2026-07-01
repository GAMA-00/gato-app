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
  certification_files: { name: string; type: string; url: string }[] | null;
  cover_theme: string | null;
  service_type_name: string | null;
}

export interface PublicListing {
  id: string;
  title: string;
  description: string | null;
  base_price: number | null;
  duration: number | null;
  gallery_images: string[] | null;
  slot_preferences: { minNoticeHours?: number } | null;
  /** ID del listing padre (diferente de id sólo cuando es variante expandida) */
  listing_id: string;
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

/** Servicios activos del proveedor (listings con lectura pública).
 *  Si un listing tiene service_variants, cada variante se expande como item individual.
 */
export function usePublicListings(providerId?: string) {
  return useQuery({
    queryKey: ["public-listings", providerId],
    enabled: !!providerId,
    queryFn: async (): Promise<PublicListing[]> => {
      const { data, error } = await db
        .from("listings")
        .select("id, title, description, base_price, duration, gallery_images, slot_preferences, service_variants")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      const rows: PublicListing[] = [];
      for (const l of data ?? []) {
        const variants = Array.isArray(l.service_variants) ? l.service_variants : [];
        if (variants.length > 0) {
          for (const v of variants) {
            rows.push({
              id: v.id ?? l.id,
              title: v.name ?? l.title,
              description: l.description,
              base_price: Number(v.price) ?? l.base_price,
              duration: Number(v.duration) ?? l.duration,
              gallery_images: l.gallery_images,
              slot_preferences: l.slot_preferences,
              listing_id: l.id,
            });
          }
        } else {
          rows.push({ ...l, listing_id: l.id });
        }
      }
      return rows;
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
