/**
 * TIPOS DE GEOGRAFÍA DE COSTA RICA (concepto v1)
 * ==============================================
 *
 * Provincias y cantones oficiales de CR. Base para:
 * - Cantón de residencia del proveedor (O-3)
 * - Zonas de trabajo (O-6, SE-3)
 * - Ubicación del cliente y recomendación por proximidad (BL-2, A-4)
 *
 * Ver docs/CONCEPTO_V1.md §5.1 y docs/skills/SKILL_CANTONES_GEO.md
 */

/** Una de las 7 provincias de Costa Rica */
export interface Provincia {
  id: number;        // 1..7 (código oficial)
  nombre: string;
}

/** Uno de los 84 cantones de Costa Rica */
export interface Canton {
  id: number;            // código oficial: provincia*100 + número (ej: Escazú = 102)
  provincia_id: number;
  nombre: string;
  // Centroide geográfico. NULL hasta cargar el dataset oficial (antes de F5).
  centroid_lat: number | null;
  centroid_lng: number | null;
}

/** Zona de trabajo de un proveedor (tabla provider_cantones) */
export interface ProviderCanton {
  provider_id: string;
  canton_id: number;
  preferred_days: number[];   // 0..6 (domingo..sábado)
  accepts_requests: boolean;
}

/** Cantón con su provincia resuelta, útil para mostrar en UI */
export interface CantonConProvincia extends Canton {
  provincia?: Provincia;
}
