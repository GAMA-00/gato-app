import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Upload, X, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { uploadGalleryImages } from '@/utils/uploadService';
import Navbar from '@/components/layout/Navbar';

const db = supabase as any;

const NOTICE_OPTIONS = [
  { v: 0, l: "Sin antelación mínima" },
  { v: 1, l: "1 hora" },
  { v: 2, l: "2 horas" },
  { v: 4, l: "4 horas" },
  { v: 12, l: "12 horas" },
  { v: 24, l: "1 día" },
  { v: 48, l: "2 días" },
  { v: 72, l: "3 días" },
];

const ServiceEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [minNoticeHours, setMinNoticeHours] = useState(0);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [providerId, setProviderId] = useState('');

  // Load service types grouped by category
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['service-types'],
    queryFn: async () =>
      (await db.from('service_types').select('id, name, service_categories(id, name, label)').order('name')).data ?? [],
  });

  // Load listing data
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await db
        .from('listings')
        .select('*, users!listings_provider_id_fkey(name, about_me)')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('No se pudo cargar el anuncio');
        navigate('/services');
        return;
      }
      // El título del anuncio es el nombre del proveedor/negocio, no el nombre del servicio
      setTitle(data.users?.name ?? data.title ?? '');
      setServiceTypeId(data.service_type_id ?? '');
      setDescription(data.users?.about_me ?? data.description ?? '');
      setProviderId(data.provider_id);
      const prefs = data.slot_preferences ?? {};
      setRequirements(prefs.serviceRequirements ?? '');
      setMinNoticeHours(prefs.minNoticeHours ?? 0);
      setExistingImages(Array.isArray(data.gallery_images) ? data.gallery_images.filter(Boolean) : []);
    };
    load();
  }, [id, navigate]);

  const addFiles = (files: File[]) => {
    setNewFiles((prev) => [...prev, ...files]);
    setNewPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };
  const removeNewFile = (i: number) => {
    URL.revokeObjectURL(newPreviews[i]);
    setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
    setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };
  const removeExistingImage = (i: number) => setExistingImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim()) { toast.error('El nombre es requerido'); return; }
    if (!serviceTypeId) { toast.error('Seleccioná el tipo de servicio'); return; }
    if (!description.trim()) { toast.error('La descripción es requerida'); return; }
    if (!id || !providerId) return;

    setSaving(true);
    try {
      // Upload new gallery images
      let uploadedUrls: string[] = [];
      if (newFiles.length > 0) {
        uploadedUrls = await uploadGalleryImages(newFiles, providerId);
      }
      const allImages = [...existingImages, ...uploadedUrls];

      // Update listing (title = nombre del negocio)
      const { error: listingErr } = await db.from('listings').update({
        service_type_id: serviceTypeId,
        description: description.trim(),
        gallery_images: allImages.length > 0 ? allImages : null,
        slot_preferences: {
          serviceRequirements: requirements.trim() || null,
          minNoticeHours,
        },
      }).eq('id', id);
      if (listingErr) throw listingErr;

      // El nombre y descripción se guardan en el perfil del proveedor
      const { error: userErr } = await db.from('users').update({
        name: title.trim(),
        about_me: description.trim(),
      }).eq('id', providerId);
      if (userErr) throw userErr;

      queryClient.invalidateQueries({ queryKey: ['listings'] });
      toast.success('Anuncio actualizado');
      navigate('/services');
    } catch (e: any) {
      toast.error('Error al guardar: ' + (e.message ?? 'intentá de nuevo'));
    } finally {
      setSaving(false);
    }
  };

  // Build grouped categories for select
  const cats = new Map<string, { label: string; types: any[] }>();
  for (const t of serviceTypes) {
    const cat = (t as any).service_categories;
    const key = cat?.name ?? 'other';
    const label = cat?.label ?? 'Otros';
    if (!cats.has(key)) cats.set(key, { label, types: [] });
    cats.get(key)!.types.push(t);
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-lg px-4 pt-[4.5rem] pb-24">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate('/services')} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">Editar anuncio</h1>
        </div>

        <div className="space-y-5">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label>Tu nombre o el del negocio</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
              placeholder="Ej: Limpiezas El Rey"
            />
          </div>

          {/* Tipo de servicio */}
          <div className="space-y-1.5">
            <Label>Tipo de servicio</Label>
            <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Seleccioná el tipo" /></SelectTrigger>
              <SelectContent>
                {Array.from(cats.entries()).map(([key, { label, types }]) => (
                  <SelectGroup key={key}>
                    <SelectLabel>{label}</SelectLabel>
                    {types.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contale a tus clientes quién sos y qué ofrecés..."
              maxLength={300}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">{description.length}/300</p>
          </div>

          {/* Requerimientos */}
          <div className="space-y-1.5">
            <Label>Requerimientos para el servicio <span className="text-muted-foreground text-xs">(opcional)</span></Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Ej: Acceso a toma de agua, área techada, espacio para parquear..."
              maxLength={300}
              className="min-h-[70px]"
            />
          </div>

          {/* Antelación */}
          <div className="space-y-1.5">
            <Label>Antelación mínima para reservar</Label>
            <Select value={String(minNoticeHours)} onValueChange={(v) => setMinNoticeHours(Number(v))}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {NOTICE_OPTIONS.map((o) => <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Galería */}
          <div className="space-y-2">
            <Label>Galería de imágenes <span className="text-muted-foreground text-xs">(opcional)</span></Label>

            {/* Imágenes existentes */}
            {existingImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {existingImages.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nuevas imágenes */}
            {newPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newPreviews.map((url, i) => (
                  <div key={i} className="relative">
                    <img src={url} alt="" className="h-20 w-20 rounded-lg object-cover border-2 border-primary/30" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-border p-3 hover:border-primary hover:bg-primary/5 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Agregar fotos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {/* Enlace al catálogo */}
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Catálogo de servicios</p>
                <p className="text-xs text-muted-foreground mt-0.5">Gestioná los servicios y precios que ofrecés.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/services/catalog/${id}`)}>
                Editar
              </Button>
            </div>
          </div>
        </div>

        {/* Guardar */}
        <div className="mt-8 flex gap-3">
          <Button variant="outline" className="flex-1 h-12" onClick={() => navigate('/services')}>
            Cancelar
          </Button>
          <Button className="flex-1 h-12" disabled={saving} onClick={handleSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </>
  );
};

export default ServiceEdit;
