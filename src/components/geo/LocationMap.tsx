import { useEffect, useRef, useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface LatLng {
  lat: number;
  lng: number;
}

interface LocationMapProps {
  initialCoords?: LatLng | null;
  onLocationSelect: (coords: LatLng, label: string) => void;
}

// Nominatim geocoding (OpenStreetMap) — sin API key
async function geocode(query: string): Promise<{ lat: number; lng: number; label: string }[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=cr&accept-language=es`;
  const res = await fetch(url, { headers: { "Accept-Language": "es" } });
  const data = await res.json();
  return data.map((r: any) => ({
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    label: r.display_name,
  }));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`;
  const res = await fetch(url);
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// CR center
const CR_CENTER: LatLng = { lat: 9.7489, lng: -83.7534 };

export default function LocationMap({ initialCoords, onLocationSelect }: LocationMapProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ lat: number; lng: number; label: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Load Leaflet CSS dynamically
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      const center = initialCoords ?? CR_CENTER;
      const zoom = initialCoords ? 15 : 7;

      const map = L.default.map(mapDivRef.current!, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.default.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      // Custom minimal pin icon
      const icon = L.default.divIcon({
        html: `<div style="
          width:28px;height:28px;
          background:#E07250;
          border:3px solid #fff;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        className: "",
      });

      const marker = L.default.marker([center.lat, center.lng], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        const label = await reverseGeocode(pos.lat, pos.lng);
        setSelectedLabel(label);
        onLocationSelect({ lat: pos.lat, lng: pos.lng }, label);
      });

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        const label = await reverseGeocode(lat, lng);
        setSelectedLabel(label);
        onLocationSelect({ lat, lng }, label);
      });

      mapRef.current = map;
      markerRef.current = marker;

      if (initialCoords) {
        reverseGeocode(initialCoords.lat, initialCoords.lng).then((label) => {
          setSelectedLabel(label);
          onLocationSelect(initialCoords, label);
        });
      }

      setMapReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  const flyTo = useCallback((coords: LatLng, label: string) => {
    if (!mapRef.current || !markerRef.current) return;
    mapRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 0.8 });
    markerRef.current.setLatLng([coords.lat, coords.lng]);
    setSelectedLabel(label);
    setResults([]);
    setQuery("");
    onLocationSelect(coords, label);
  }, [onLocationSelect]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await geocode(query);
      setResults(res);
    } finally {
      setSearching(false);
    }
  };

  // Short label for display (first two comma-separated parts)
  const shortLabel = (label: string) =>
    label.split(",").slice(0, 2).join(",").trim();

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            className="w-full h-11 pl-9 pr-8 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Buscar dirección o lugar..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </button>
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="rounded-xl border bg-background shadow-sm overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => flyTo(r, r.label)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 border-b last:border-0 truncate"
            >
              {shortLabel(r.label)}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border">
        <div ref={mapDivRef} style={{ height: "240px", width: "100%" }} />
        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Selected location label */}
      {selectedLabel && (
        <p className="text-xs text-muted-foreground px-1 leading-snug">
          📍 {shortLabel(selectedLabel)}
        </p>
      )}

      <p className="text-xs text-muted-foreground px-1">
        Tocá el mapa o arrastrá el pin para ajustar la ubicación exacta.
      </p>
    </div>
  );
}
