import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import Navbar from '@/components/layout/Navbar';
import { v4 as uuid } from 'uuid';

const db = supabase as any;

const DURATIONS = [
  { v: 30, l: "30 min" }, { v: 60, l: "1 h" }, { v: 90, l: "1 h 30" }, { v: 120, l: "2 h" },
  { v: 150, l: "2 h 30" }, { v: 180, l: "3 h" }, { v: 210, l: "3 h 30" }, { v: 240, l: "4 h" }, { v: 300, l: "más de 4 h" },
];

interface Variant {
  id: string;
  name: string;
  price: string;
  duration: number;
}

const ServiceCatalog: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Variant | null>(null);
  const [listingTitle, setListingTitle] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await db.from('listings').select('title, base_price, duration, service_variants').eq('id', id).single();
      if (error || !data) {
        toast.error('No se pudo cargar el catálogo');
        navigate('/services');
        return;
      }
      setListingTitle(data.title ?? '');
      const raw = Array.isArray(data.service_variants) ? data.service_variants : [];
      if (raw.length === 0) {
        // Bootstrap from base_price / duration
        setVariants([{ id: uuid(), name: data.title ?? 'Servicio básico', price: String(data.base_price ?? 0), duration: data.duration ?? 60 }]);
      } else {
        setVariants(raw.map((v: any) => ({ id: v.id ?? uuid(), name: v.name ?? '', price: String(v.price ?? ''), duration: Number(v.duration) || 60 })));
      }
      setLoading(false);
    };
    load();
  }, [id, navigate]);

  const startEdit = (v: Variant) => { setEditingId(v.id); setDraft({ ...v }); };
  const cancelEdit = () => { setEditingId(null); setDraft(null); };
  const confirmEdit = () => {
    if (!draft) return;
    if (!draft.name.trim()) { toast.error('El nombre es requerido'); return; }
    if (!draft.price || Number(draft.price) <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
    setVariants((prev) => prev.map((v) => v.id === draft.id ? draft : v));
    setEditingId(null);
    setDraft(null);
  };
  const addVariant = () => {
    const newV: Variant = { id: uuid(), name: '', price: '', duration: 60 };
    setVariants((prev) => [...prev, newV]);
    setEditingId(newV.id);
    setDraft(newV);
  };
  const removeVariant = (varId: string) => {
    if (variants.length <= 1) { toast.error('Debe tener al menos un servicio'); return; }
    setVariants((prev) => prev.filter((v) => v.id !== varId));
    if (editingId === varId) { setEditingId(null); setDraft(null); }
  };

  const handleSave = async () => {
    if (!id) return;
    const invalid = variants.find((v) => !v.name.trim() || !v.price || Number(v.price) <= 0);
    if (invalid) { toast.error('Completá nombre y precio de todos los servicios'); return; }
    setSaving(true);
    try {
      const first = variants[0];
      const { error } = await db.from('listings').update({
        service_variants: variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price), duration: v.duration })),
        base_price: Number(first.price),
        duration: first.duration,
        standard_duration: first.duration,
      }).eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['public-listings'] });
      toast.success('Catálogo actualizado');
      navigate(`/services/edit/${id}`);
    } catch (e: any) {
      toast.error('Error al guardar: ' + (e.message ?? 'intentá de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: string) =>
    price ? `₡${Number(price).toLocaleString('es-CR')}` : '—';
  const durationLabel = (min: number) =>
    DURATIONS.find((d) => d.v === min)?.l ?? `${min} min`;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-lg px-4 pt-[4.5rem] pb-24">
        {/* Header */}
        <div className="mb-2 flex items-center gap-3">
          <button onClick={() => navigate(`/services/edit/${id}`)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Catálogo de servicios</h1>
            <p className="text-xs text-muted-foreground">{listingTitle}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Estos son los servicios y precios que verán tus clientes al reservar.
        </p>

        <div className="space-y-3">
          {variants.map((v) => (
            <div key={v.id} className="rounded-xl border bg-card">
              {editingId === v.id && draft ? (
                /* Modo edición */
                <div className="p-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Nombre del servicio</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="h-11"
                      placeholder="Ej: Limpieza básica"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Precio (₡)</Label>
                      <Input
                        inputMode="numeric"
                        value={draft.price}
                        onChange={(e) => setDraft({ ...draft, price: e.target.value.replace(/\D/g, '') })}
                        className="h-11"
                        placeholder="25000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Duración</Label>
                      <Select
                        value={String(draft.duration)}
                        onValueChange={(val) => setDraft({ ...draft, duration: Number(val) })}
                      >
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map((d) => <SelectItem key={d.v} value={String(d.v)}>{d.l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEdit} className="flex-1">
                      <X className="h-4 w-4 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" onClick={confirmEdit} className="flex-1">
                      <Check className="h-4 w-4 mr-1" /> Listo
                    </Button>
                  </div>
                </div>
              ) : (
                /* Modo visualización */
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{v.name || <span className="text-muted-foreground italic">Sin nombre</span>}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{formatPrice(v.price)} · {durationLabel(v.duration)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(v)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeVariant(v.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addVariant}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 py-3 text-sm font-medium text-primary hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-4 w-4" /> Agregar servicio
          </button>
        </div>

        {/* Guardar */}
        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={() => navigate(`/services/edit/${id}`)}>
            Cancelar
          </Button>
          <Button className="flex-1 h-12" disabled={saving} onClick={handleSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar catálogo
          </Button>
        </div>
      </div>
    </>
  );
};

export default ServiceCatalog;
