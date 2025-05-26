
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
    
    // Validar el tamaño del archivo (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "La imagen no debe exceder los 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Generar un nombre único para el archivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${uuidv4()}.${fileExt}`;
      
      // Crear la ruta del archivo usando el ID del usuario como carpeta
      const filePath = folder ? `${user.id}/${folder}/${fileName}` : `${user.id}/${fileName}`;
      
      console.log('=== ImageUploader - Upload Process ===');
      console.log('File:', file);
      console.log('File type:', file.type);
      console.log('File size:', file.size);
      console.log('File path:', filePath);
      console.log('Bucket:', bucket);
      
      // Eliminar imagen anterior si existe
      if (currentImageUrl) {
        try {
          // Extraer el path de la URL anterior
          const url = new URL(currentImageUrl);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.findIndex(part => part === bucket);
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const oldPath = pathParts.slice(bucketIndex + 1).join('/');
            console.log('Attempting to delete old image:', oldPath);
            
            const { error: deleteError } = await supabase.storage
              .from(bucket)
              .remove([oldPath]);
            
            if (deleteError) {
              console.warn('Could not delete old image:', deleteError);
            } else {
              console.log('Old image deleted successfully');
            }
          }
        } catch (deleteError) {
          console.warn('Error parsing/deleting old image URL:', deleteError);
        }
      }
      
      // Convertir el archivo a un ArrayBuffer para asegurar el tipo correcto
      const fileBuffer = await file.arrayBuffer();
      
      console.log('File buffer size:', fileBuffer.byteLength);
      console.log('Uploading to path:', filePath);
      console.log('Content-Type will be set to:', file.type);
      
      // Subir el archivo a Supabase Storage con configuración específica
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // Explicitly set the correct content type
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(uploadError.message);
      }
      
      if (!uploadData || !uploadData.path) {
        throw new Error('No se pudo obtener la ruta del archivo subido');
      }
      
      console.log('Upload successful:', uploadData);
      
      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('No se pudo obtener la URL pública');
      }
      
      console.log('Public URL generated:', urlData.publicUrl);
      
      // Verificar que la imagen se puede acceder con un pequeño delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const response = await fetch(urlData.publicUrl, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        console.log('Image accessibility check - Status:', response.status);
        console.log('Image accessibility check - Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          throw new Error(`Image not accessible: ${response.status}`);
        }
        console.log('Image accessibility verified successfully');
      } catch (verifyError) {
        console.warn('Could not verify image accessibility:', verifyError);
        // No lanzar error aquí, continuar con el proceso
      }
      
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
        description: error.message || "Hubo un problema al subir la imagen. Por favor, intenta de nuevo.",
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
