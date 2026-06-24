import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProvincias, useCantones } from "@/hooks/useGeografia";

/**
 * Selector jerárquico Provincia → Cantón (concepto v1).
 * Usado en O-3 (cantón de residencia) y como base de O-6/SE-3.
 *
 * Controlado: recibe el `value` (id de cantón) y notifica cambios con `onChange`.
 * Ver docs/skills/SKILL_CANTONES_GEO.md
 */
interface CantonSelectorProps {
  value?: number | null;
  onChange: (cantonId: number | null) => void;
  /** Etiquetas opcionales (texto + ícono siempre, principio de diseño v1) */
  provinciaLabel?: string;
  cantonLabel?: string;
  disabled?: boolean;
}

export function CantonSelector({
  value,
  onChange,
  provinciaLabel = "Provincia",
  cantonLabel = "Cantón",
  disabled = false,
}: CantonSelectorProps) {
  const [provinciaId, setProvinciaId] = useState<number | undefined>(undefined);

  const { data: provincias = [], isLoading: loadingProvincias } = useProvincias();
  const { data: cantones = [], isLoading: loadingCantones } = useCantones(provinciaId);

  // Si llega un cantón ya seleccionado (ej: edición en SE-3), inferir su provincia.
  // El código oficial de cantón es provincia*100 + número, así que la provincia es id/100.
  useEffect(() => {
    if (value && provinciaId === undefined) {
      setProvinciaId(Math.floor(value / 100));
    }
  }, [value, provinciaId]);

  const handleProvinciaChange = (val: string) => {
    const newProvinciaId = Number(val);
    setProvinciaId(newProvinciaId);
    onChange(null); // al cambiar de provincia, se limpia el cantón
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provincia-select">{provinciaLabel}</Label>
        <Select
          value={provinciaId ? String(provinciaId) : undefined}
          onValueChange={handleProvinciaChange}
          disabled={disabled || loadingProvincias}
        >
          <SelectTrigger id="provincia-select" className="h-12 text-base">
            <SelectValue placeholder="Elegí tu provincia" />
          </SelectTrigger>
          <SelectContent>
            {provincias.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="canton-select">{cantonLabel}</Label>
        <Select
          value={value ? String(value) : undefined}
          onValueChange={(val) => onChange(Number(val))}
          disabled={disabled || !provinciaId || loadingCantones}
        >
          <SelectTrigger id="canton-select" className="h-12 text-base">
            <SelectValue
              placeholder={provinciaId ? "Elegí tu cantón" : "Primero elegí la provincia"}
            />
          </SelectTrigger>
          <SelectContent>
            {cantones.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
