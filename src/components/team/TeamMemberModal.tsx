
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Phone, IdCard, FileCheck, Upload } from 'lucide-react';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: TeamMember;
  mode: 'create' | 'edit' | 'view';
  onSave?: (data: TeamMemberFormData) => void;
}

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  mode,
  onSave
}) => {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    cedula: '',
    phone: '',
    photoUrl: '',
    criminalRecordFileUrl: ''
  });

  useEffect(() => {
    if (member && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: member.name,
        cedula: member.cedula,
        phone: member.phone,
        photoUrl: member.photoUrl || '',
        criminalRecordFileUrl: member.criminalRecordFileUrl || ''
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        cedula: '',
        phone: '',
        photoUrl: '',
        criminalRecordFileUrl: ''
      });
    }
  }, [member, mode, isOpen]);

  const handleSave = () => {
    if (!formData.name || !formData.cedula || !formData.phone) {
      return;
    }
    onSave?.(formData);
    onClose();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleDisplay = (member: TeamMember) => {
    if (member?.role === 'lider') return 'Líder del equipo';
    return `Auxiliar ${member?.positionOrder || 1}`;
  };

  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode && 'Agregar nuevo miembro'}
            {mode === 'edit' && 'Editar miembro del equipo'}
            {isViewMode && 'Detalles del miembro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar y role badge */}
          <div className="text-center">
            <Avatar className="w-20 h-20 mx-auto mb-2">
              <AvatarImage src={formData.photoUrl} alt={formData.name} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {formData.name ? getInitials(formData.name) : <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            {member && isViewMode && (
              <Badge variant={member.role === 'lider' ? 'default' : 'secondary'}>
                {getRoleDisplay(member)}
              </Badge>
            )}
          </div>

          {/* Foto */}
          {!isViewMode && (
            <div className="space-y-2">
              <Label htmlFor="photoUrl">Foto (URL)</Label>
              <Input
                id="photoUrl"
                placeholder="https://ejemplo.com/foto.jpg"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              />
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Nombre completo
            </Label>
            <Input
              id="name"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isViewMode}
              required
            />
          </div>

          {/* Cédula */}
          <div className="space-y-2">
            <Label htmlFor="cedula" className="flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              Número de cédula
            </Label>
            <Input
              id="cedula"
              placeholder="1-2345-6789"
              value={formData.cedula}
              onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
              disabled={isViewMode}
              required
            />
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Teléfono celular
            </Label>
            <Input
              id="phone"
              placeholder="8888-8888"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isViewMode}
              required
            />
          </div>

          {/* Hoja de delincuencia */}
          <div className="space-y-2">
            <Label htmlFor="criminalRecord" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Hoja de delincuencia
            </Label>
            {isViewMode ? (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
                <FileCheck className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">
                  {member?.criminalRecordFileUrl ? 'Documento verificado' : 'Documento pendiente'}
                </span>
              </div>
            ) : (
              <Input
                id="criminalRecord"
                placeholder="URL del documento"
                value={formData.criminalRecordFileUrl}
                onChange={(e) => setFormData({ ...formData, criminalRecordFileUrl: e.target.value })}
              />
            )}
          </div>
        </div>

        {!isViewMode && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isCreateMode ? 'Agregar miembro' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberModal;
