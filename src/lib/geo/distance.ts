/**
 * Utilidades de distancia geográfica (concepto v1).
 * Base para "tiempo en traslados" (H-1, SE-5) y recomendación por proximidad (A-4, S-2).
 * Ver docs/skills/SKILL_CANTONES_GEO.md y SKILL_PROXIMITY_SLOTS.md
 */

const EARTH_RADIUS_KM = 6371;
const CITY_SPEED_KMH = 30; // velocidad promedio en ciudad (spec §8.3)

const toRad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Tiempo estimado de traslado en minutos a velocidad de ciudad (30 km/h). */
export function travelTimeMinutes(a: LatLng, b: LatLng): number {
  return (distanceKm(a, b) / CITY_SPEED_KMH) * 60;
}

/**
 * Convierte el centroide de un cantón (centroid_lat/lng, posiblemente null) en LatLng.
 * Devuelve null si el cantón no tiene centroide cargado.
 */
export function cantonCentroid(canton?: {
  centroid_lat: number | null;
  centroid_lng: number | null;
} | null): LatLng | null {
  if (!canton || canton.centroid_lat == null || canton.centroid_lng == null) return null;
  return { lat: canton.centroid_lat, lng: canton.centroid_lng };
}
