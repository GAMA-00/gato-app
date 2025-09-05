
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UnifiedAvatar from '@/components/ui/unified-avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';
import { useState, useEffect, useRef } from 'react';
import { User, Phone, IdCard, FileCheck, Upload, X } from 'lucide-react';
import { uploadTeamMemberPhoto } from '@/utils/uploadService';
import { toast } from 'sonner';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member?: TeamMember;
  mode: 'create' | 'edit' | 'view';
  onSave?: (data: TeamMemberFormData) => void;
  providerId: string;
}

const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  mode,
  onSave,
  providerId
}) => {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    name: '',
    cedula: '',
    phone: '',
    photoUrl: '',
    criminalRecordFileUrl: ''
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (member && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: member.name,
        cedula: member.cedula,
        phone: member.phone,
        photoUrl: member.photoUrl || '',
        criminalRecordFileUrl: member.criminalRecordFileUrl || ''
      });
      setPhotoPreview(member.photoUrl || '');
    } else if (mode === 'create') {
      setFormData({
        name: '',
        cedula: '',
        phone: '',
        photoUrl: '',
        criminalRecordFileUrl: ''
      });
      setPhotoPreview('');
    }
    setPhotoFile(null);
  }, [member, mode]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsUploading(true);
    try {
      let finalFormData = { ...formData };
      
      // Upload photo if there's a new file
      if (photoFile) {
        // Generate a unique ID for the photo (using current timestamp + random)
        const memberId = member?.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const uploadResult = await uploadTeamMemberPhoto(photoFile, providerId, memberId);
        
        if (uploadResult.success && uploadResult.url) {
          finalFormData.photoUrl = uploadResult.url;
        } else {
          toast.error('Error al subir la foto: ' + uploadResult.error);
          return;
        }
      }
      
      onSave(finalFormData);
      onClose();
    } catch (error) {
      console.error('Error saving team member:', error);
      toast.error('Error al guardar el miembro del equipo');
    } finally {
      setIsUploading(false);
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

  const getModalDescription = () => {
    switch (mode) {
      case 'create':
        return 'Ingresa la información del nuevo miembro del equipo que deseas agregar.';
      case 'edit':
        return 'Modifica la información del miembro del equipo seleccionado.';
      case 'view':
        return 'Información detallada del miembro del equipo seleccionado.';
      default:
        return '';
    }
  };

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
          <DialogDescription>
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Photo Section */}
          <div className="text-center mb-4">
            <UnifiedAvatar 
              src={photoPreview || member?.photoUrl} 
              name={formData.name || 'Miembro del equipo'}
              size="xl"
              className="mx-auto mb-2"
              onError={() => console.error('TeamMemberModal: Failed to load photo')}
              onLoad={() => console.log('TeamMemberModal: Photo loaded successfully')}
            />
            
            {mode === 'view' && member && (
              <Badge variant={member.role === 'lider' ? 'default' : 'secondary'}>
                {member.role === 'lider' ? 'Líder del equipo' : `Auxiliar ${member.positionOrder}`}
              </Badge>
            )}
            
            {mode !== 'view' && (
              <div className="mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {photoPreview ? 'Cambiar Foto' : 'Agregar Foto'}
                </Button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(member?.photoUrl || '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

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
              <Button onClick={handleSave} className="flex-1" disabled={isUploading}>
                {isUploading ? 'Guardando...' : mode === 'create' ? 'Agregar' : 'Guardar cambios'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamMemberModal;
