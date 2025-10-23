import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileUp, Camera, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface EvidenceUploaderProps {
  onFileSelect: (file: File | null) => void;
  currentFile?: File | null;
  existingUrl?: string; // 🆕 URL de evidencia existente
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  label?: string;
  showLabel?: boolean;
}

export const EvidenceUploader = ({
  onFileSelect,
  currentFile,
  existingUrl,
  accept = "image/*,.pdf",
  maxSizeMB = 10,
  className = "",
  label = "Evidencia (opcional)",
  showLabel = true
}: EvidenceUploaderProps) => {
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File | null) => {
    if (!file) return;

    // Validar tamaño
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`El archivo debe ser menor a ${maxSizeMB}MB`);
      return;
    }

    // Validar tipo
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(type => 
      type === 'image/*' && file.type.startsWith('image/') ||
      type === fileExtension ||
      type === file.type
    );

    if (!isValidType) {
      toast.error('Formato de archivo no válido');
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && (
        <Label className="text-xs font-medium">{label}</Label>
      )}

      {/* Input oculto para documentos */}
      <input
        ref={documentInputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          validateAndSelectFile(e.target.files?.[0] || null);
          // Reset input para permitir seleccionar el mismo archivo nuevamente
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Input oculto para cámara */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          validateAndSelectFile(e.target.files?.[0] || null);
          // Reset input para permitir seleccionar el mismo archivo nuevamente
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Mostrar evidencia existente si hay */}
      {!currentFile && existingUrl && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span className="text-sm text-blue-700 truncate flex-1">
            Evidencia adjunta
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => window.open(existingUrl, '_blank')}
            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            title="Ver evidencia"
          >
            <Camera className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onFileSelect(null)}
            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Eliminar"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {!currentFile && !existingUrl && (
        <div className="space-y-2">
          {/* Botón: Seleccionar documento */}
          <Button
            type="button"
            variant="outline"
            onClick={() => documentInputRef.current?.click()}
            className="w-full justify-start h-auto py-2.5 px-3 text-sm whitespace-normal text-left"
          >
            <FileUp className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Seleccionar documento</span>
          </Button>

          {/* Botón: Tomar foto */}
          <Button
            type="button"
            variant="outline"
            onClick={() => cameraInputRef.current?.click()}
            className="w-full justify-start h-auto py-2.5 px-3 text-sm whitespace-normal text-left"
          >
            <Camera className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Tomar foto</span>
          </Button>
        </div>
      )}

      {currentFile && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700 truncate flex-1">
            {currentFile.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onFileSelect(null)}
            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
};
