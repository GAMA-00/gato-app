import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Users } from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  useTeamMembers,
  useAddTeamMember,
  useRemoveTeamMember,
} from "@/hooks/useTeamMembers";

const TeamMembersSection: React.FC = () => {
  const { data: members = [], isLoading } = useTeamMembers();
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    try {
      await addMember.mutateAsync({ name, phone });
      setName("");
      setPhone("");
      setAdding(false);
      toast.success("Miembro agregado");
    } catch (e: any) {
      toast.error("Error al agregar: " + e.message);
    }
  };

  const handleRemove = async (id: string, memberName: string) => {
    if (!confirm(`¿Eliminar a ${memberName} del equipo?`)) return;
    try {
      await removeMember.mutateAsync(id);
      toast.success("Miembro eliminado");
    } catch (e: any) {
      toast.error("Error al eliminar: " + e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          Equipo de trabajo
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Agregá los miembros de tu equipo para asignarles citas cuando las aceptés.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lista de miembros */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : members.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground">No tenés miembros de equipo aún.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">{m.name}</p>
                  {m.phone && (
                    <p className="text-xs text-muted-foreground">{m.phone}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(m.id, m.name)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  disabled={removeMember.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulario inline para agregar */}
        {adding ? (
          <div className="rounded-xl border p-4 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ana González"
                className="h-10"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono (opcional)</Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="12345678"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={addMember.isPending || !name.trim()}
                className="flex-1"
              >
                Guardar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setAdding(false); setName(""); setPhone(""); }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setAdding(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar miembro
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMembersSection;
