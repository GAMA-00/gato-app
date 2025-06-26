
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';
import { useState, useEffect } from 'react';
import { User, Phone, IdCard, FileCheck } from 'lucide-react';

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
  }, [member, mode]);

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
      onClose();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isReadOnly = mode === 'view';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {mode === 'create' && 'Agregar Miembro del Equipo'}
            {mode === 'edit' && 'Editar Miembro del Equipo'}
            {mode === 'view' && 'Detalles del Miembro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'view' && member && (
            <div className="text-center mb-4">
              <Avatar className="w-20 h-20 mx-auto mb-2">
                <AvatarImage src={member.photoUrl} alt={member.name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <Badge variant={member.role === 'lider' ? 'default' : 'secondary'}>
                {member.role === 'lider' ? 'Líder del equipo' : `Auxiliar ${member.positionOrder}`}
              </Badge>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                readOnly={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="cedula" className="flex items-center gap-1">
                <IdCard className="w-4 h-4" />
                Cédula
              </Label>
              <Input
                id="cedula"
                value={formData.cedula}
                onChange={(e) => setFormData(prev => ({ ...prev, cedula: e.target.value }))}
                readOnly={isReadOnly}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                Teléfono
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                readOnly={isReadOnly}
              />
            </div>

            {member?.criminalRecordFileUrl && (
              <div>
                <Label className="flex items-center gap-1">
                  <FileCheck className="w-4 h-4" />
                  Hoja de delincuencia
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1"
                  onClick={() => window.open(member.criminalRecordFileUrl, '_blank')}
                >
                  Ver documento
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {isReadOnly ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!isReadOnly && (
              <Button onClick={handleSave} className="flex-1">
                {mode === 'create' ? 'Agregar' : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberModal;
