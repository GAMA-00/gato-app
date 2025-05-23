
import React from 'react';
import { Button } from '@/components/ui/button';
import { FormDescription } from '@/components/ui/form';
import { File, Upload, Trash2, Eye } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

interface CertificationFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface CertificationUploaderProps {
  certificationFiles: CertificationFile[];
  onFilesChange: (files: CertificationFile[]) => void;
}

const CertificationUploader: React.FC<CertificationUploaderProps> = ({
  certificationFiles,
  onFilesChange
}) => {
  const handleCertificationFile = async (file: File) => {
    if (!file) return;
    
    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de archivo no permitido. Use PDF o imágenes (JPG, PNG)');
      return;
    }
    
    if (file.size > maxSize) {
      toast.error('El archivo es demasiado grande. Máximo 5MB');
      return;
    }
    
    // Create preview only for image types
    let preview = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }
    
    // Add file to form state
    const newFiles = [...certificationFiles, {
      id: uuidv4(),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: preview
    }];
    
    onFilesChange(newFiles);
  };
  
  const removeCertificationFile = (id: string) => {
    // First revoke any object URLs to prevent memory leaks
    const fileToRemove = certificationFiles.find(f => f.id === id);
    if (fileToRemove && fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    
    const newFiles = certificationFiles.filter(f => f.id !== id);
    onFilesChange(newFiles);
  };
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      certificationFiles.forEach(fileObj => {
        if (fileObj.preview && typeof fileObj.preview === 'string' && fileObj.preview.startsWith('blob:')) {
          URL.revokeObjectURL(fileObj.preview);
        }
      });
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 mb-2">
        {certificationFiles.map((certFile) => (
          <div 
            key={certFile.id} 
            className="relative bg-muted/50 rounded-md p-2 pr-8 flex items-center gap-2 border"
          >
            <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="max-w-[150px] overflow-hidden">
              <div className="text-xs font-medium truncate">{certFile.name}</div>
              <div className="text-[10px] text-muted-foreground">{formatFileSize(certFile.size)}</div>
            </div>
            <button 
              type="button" 
              className="absolute top-1 right-1 text-muted-foreground hover:text-destructive"
              onClick={() => removeCertificationFile(certFile.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {certFile.preview && (
              <button 
                type="button" 
                className="absolute bottom-1 right-1 text-muted-foreground hover:text-primary"
                onClick={() => {
                  if (certFile.preview) {
                    window.open(certFile.preview, '_blank')
                  }
                }}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      
      <label className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors inline-block">
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">Subir certificado</span>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleCertificationFile(file);
          }}
        />
      </label>
      <FormDescription className="text-xs">
        Formatos aceptados: PDF, JPG, PNG (máx 5MB)
      </FormDescription>
    </div>
  );
};

export default CertificationUploader;
