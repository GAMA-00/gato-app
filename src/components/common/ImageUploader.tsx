
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  onImageUploaded: (url: string) => void;
  currentImageUrl?: string;
  buttonText?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

const ImageUploader = ({ 
  onImageUploaded, 
  currentImageUrl,
  buttonText = "Cambiar imagen",
  bucket = "avatars",
  folder = "",
  className = ""
}: ImageUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Debes estar autenticado para subir imágenes.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar el tipo de archivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido.",
        variant: "destructive"
      });
      return;
    }
    
    // Validar el tamaño del archivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe exceder los 2MB.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generar un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      
      // Crear la ruta del archivo usando el ID del usuario como carpeta
      const filePath = `${user.id}/${fileName}`;
      
      console.log('=== ImageUploader - Upload Process ===');
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      console.log('File path:', filePath);
      
      // Subir el archivo a Supabase Storage con Content-Type correcto
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // Especificar explícitamente el Content-Type
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      console.log('Upload successful:', data);
      
      // Obtener la URL pública del archivo
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      console.log('Public URL:', urlData.publicUrl);
      
      // Llamar al callback con la URL de la imagen
      onImageUploaded(urlData.publicUrl);
      
      toast({
        title: "¡Éxito!",
        description: "Imagen subida correctamente."
      });
      
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: "Hubo un problema al subir la imagen. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleButtonClick}
        disabled={isLoading}
        className="flex items-center"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {buttonText}
          </>
        )}
      </Button>
    </div>
  );
};

export default ImageUploader;
