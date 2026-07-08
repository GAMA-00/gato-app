# 🛠️ Skill: Geografía de Costa Rica (Provincias y Cantones)

## Contexto

El nuevo concepto reemplaza la lógica de búsqueda genérica por un modelo geográfico
basado en las **7 provincias y 84 cantones** de Costa Rica (ver `docs/CONCEPTO_V1.md`
§5.1). Se usa para: cantón de residencia del proveedor (O-3), zonas de trabajo (O-6,
SE-3), ubicación del cliente (BL-2), recomendación por proximidad y cálculo de
distancias.

> Convive con `residencias`/`condominios` — **no las reemplaza** (decisión v1).

---

## Modelo de datos

```sql
provincias (id smallint PK, nombre text)              -- 7 filas
cantones   (id int PK, provincia_id smallint FK,
            nombre text, centroid_lat float8, centroid_lng float8)  -- 84 filas
```

- `provincias`: 1 San José · 2 Alajuela · 3 Cartago · 4 Heredia · 5 Guanacaste ·
  6 Puntarenas · 7 Limón.
- `centroid_lat/lng`: centro geográfico del cantón. **Es el punto que se usa para
  distancias cuando no hay otra cita de referencia ese día.** Nunca se usa la dirección
  exacta del proveedor.

### RLS

```sql
-- Lectura pública (catálogo estático)
CREATE POLICY "Cantones lectura pública" ON public.cantones FOR SELECT USING (true);
CREATE POLICY "Provincias lectura pública" ON public.provincias FOR SELECT USING (true);
-- Escritura solo backend (service_role) vía seed/migración
```

---

## Carga de datos (seed)

- No hay campo de texto libre — **siempre** selección del listado oficial.
- Los 84 cantones se cargan por migración/seed con sus centroides.
- Fuente de centroides: dataset oficial (IGN/INEC) o cálculo desde polígonos. Mantener
  el seed versionado en una migración para reproducibilidad.

```sql
INSERT INTO provincias (id, nombre) VALUES
  (1,'San José'),(2,'Alajuela'),(3,'Cartago'),(4,'Heredia'),
  (5,'Guanacaste'),(6,'Puntarenas'),(7,'Limón');

INSERT INTO cantones (id, provincia_id, nombre, centroid_lat, centroid_lng) VALUES
  (101, 1, 'San José',  9.9281, -84.0907),
  (102, 1, 'Escazú',    9.9189, -84.1376),
  -- ... (84 cantones)
  ;
```

> Convención de `id`: código oficial de cantón (provincia*100 + número). Ej: Escazú=102.

---

## Selectores en UI

### Jerárquico en 2 pasos (O-3, O-6)
1. Provincia (dropdown o chips horizontales).
2. Cantón (se carga según la provincia elegida).

```typescript
const { data: provincias } = useQuery({
  queryKey: ['provincias'],
  queryFn: async () => (await supabase.from('provincias').select('*').order('id')).data,
});

const { data: cantones } = useQuery({
  queryKey: ['cantones', provinciaId],
  enabled: !!provinciaId,
  queryFn: async () =>
    (await supabase.from('cantones').select('*')
      .eq('provincia_id', provinciaId).order('nombre')).data,
});
```

- O-6/SE-3: opción "Seleccionar toda la provincia" (marca todos los cantones) +
  selección individual. Cantones elegidos se muestran como tags removibles.

---

## Geocoding inverso (GPS → cantón)

En el booking link (BL-2) el cliente comparte su GPS. La edge function
`geocode-reverse` convierte la coordenada en un `canton_id`:

- Opción A (preferida): consulta contra polígonos de cantón si están cargados.
- Opción B: Google Geocoding API → extraer cantón del resultado y mapearlo por nombre.

Guardar en la cita: `canton_id`, `client_lat`, `client_lng`.

---

## Distancias

```typescript
// Haversine entre dos puntos (km)
function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const x = Math.sin(dLat/2)**2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}
```

- Tiempo de traslado estimado = `distanceKm / 30 km/h` (velocidad ciudad, §8.3).

---

## Checklist

- [ ] `provincias` (7) y `cantones` (84) cargados por migración versionada
- [ ] Centroides presentes en los 84 cantones
- [ ] RLS: lectura pública, escritura service_role
- [ ] Selectores jerárquicos provincia → cantón
- [ ] Sin texto libre — solo listado oficial
- [ ] Nunca exponer dirección exacta del proveedor (solo cantón/centroide)
