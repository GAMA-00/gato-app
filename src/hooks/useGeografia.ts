import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Provincia, Canton, ProviderCanton } from "@/types/geo";

/**
 * Hooks de geografía de Costa Rica (concepto v1).
 * Provincias/cantones son catálogo estático (lectura pública) → cache largo.
 *
 * Nota: las tablas provincias/cantones/provider_cantones son nuevas y todavía no
 * están en los tipos autogenerados de Supabase, por eso se castea el cliente.
 * Ver docs/skills/SKILL_CANTONES_GEO.md
 */
const db = supabase as any;

// Catálogo estático: no cambia entre sesiones, cache agresivo.
const STATIC_CACHE = {
  staleTime: 1000 * 60 * 60 * 24, // 24h
  gcTime: 1000 * 60 * 60 * 24,
};

/** Las 7 provincias, ordenadas por código oficial. */
export function useProvincias() {
  return useQuery({
    queryKey: ["provincias"],
    ...STATIC_CACHE,
    queryFn: async (): Promise<Provincia[]> => {
      const { data, error } = await db
        .from("provincias")
        .select("id, nombre")
        .order("id");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Cantones. Si se pasa `provinciaId`, devuelve solo los de esa provincia
 * (ordenados alfabéticamente, como en los selectores O-3/O-6). Sin argumento,
 * devuelve los 84.
 */
export function useCantones(provinciaId?: number) {
  return useQuery({
    queryKey: ["cantones", provinciaId ?? "all"],
    ...STATIC_CACHE,
    enabled: provinciaId === undefined || !!provinciaId,
    queryFn: async (): Promise<Canton[]> => {
      let query = db
        .from("cantones")
        .select("id, provincia_id, nombre, centroid_lat, centroid_lng");
      if (provinciaId) query = query.eq("provincia_id", provinciaId);
      const { data, error } = await query.order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Zonas de trabajo (cantones) del proveedor actual. */
export function useProviderCantones(providerId?: string) {
  const { user } = useAuth();
  const id = providerId ?? user?.id;
  return useQuery({
    queryKey: ["provider-cantones", id],
    enabled: !!id,
    queryFn: async (): Promise<ProviderCanton[]> => {
      const { data, error } = await db
        .from("provider_cantones")
        .select("provider_id, canton_id, preferred_days, accepts_requests")
        .eq("provider_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Reemplaza el set de cantones de trabajo del proveedor (O-6, SE-3).
 * Hace un upsert de los seleccionados y borra los que ya no están.
 */
export function useSaveProviderCantones() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cantones: Array<Pick<ProviderCanton, "canton_id"> & Partial<ProviderCanton>>) => {
      if (!user?.id) throw new Error("No hay proveedor autenticado");

      const desiredIds = cantones.map((c) => c.canton_id);

      // 1. Upsert de los seleccionados
      if (desiredIds.length > 0) {
        const rows = cantones.map((c) => ({
          provider_id: user.id,
          canton_id: c.canton_id,
          preferred_days: c.preferred_days ?? [],
          accepts_requests: c.accepts_requests ?? true,
        }));
        const { error } = await db
          .from("provider_cantones")
          .upsert(rows, { onConflict: "provider_id,canton_id" });
        if (error) throw error;
      }

      // 2. Borrar los que ya no están seleccionados
      let del = db.from("provider_cantones").delete().eq("provider_id", user.id);
      if (desiredIds.length > 0) {
        del = del.not("canton_id", "in", `(${desiredIds.join(",")})`);
      }
      const { error: delError } = await del;
      if (delError) throw delError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-cantones"] });
    },
  });
}
