import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { unifiedAvatarUpload } from '@/utils/unifiedAvatarUpload';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import UnifiedAvatar from '@/components/ui/unified-avatar';

const AvatarUploadTest = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [preview, setPreview] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) {
      toast.error('Selecciona un archivo y asegúrate de estar autenticado');
      return;
    }

    setIsUploading(true);
    try {
      console.log('=== Starting avatar upload test ===');
      const url = await unifiedAvatarUpload(file, user.id);
      setUploadedUrl(url);
      toast.success('Avatar subido exitosamente!');
      console.log('=== Avatar upload test completed successfully ===');
    } catch (error: any) {
      console.error('=== Avatar upload test failed ===', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Avatar Upload Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Debes estar autenticado para usar este test.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Avatar Upload Test</CardTitle>
        <p className="text-sm text-muted-foreground">Usuario: {user.name || user.email}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="avatar-file">Seleccionar imagen</Label>
          <Input
            id="avatar-file"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>

        {preview && (
          <div>
            <Label>Vista previa:</Label>
            <img 
              src={preview} 
              alt="Preview" 
              className="w-24 h-24 object-cover rounded-full mx-auto"
            />
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full"
        >
          {isUploading ? 'Subiendo...' : 'Subir Avatar'}
        </Button>

        {uploadedUrl && (
          <div>
            <Label>Avatar subido:</Label>
            <div className="flex items-center space-x-4">
              <UnifiedAvatar 
                src={uploadedUrl} 
                name="Uploaded"
                size="lg"
              />
              <div className="text-xs break-all">
                <strong>URL:</strong> {uploadedUrl}
              </div>
            </div>
          </div>
        )}

        {user.avatar_url && (
          <div>
            <Label>Avatar actual del usuario:</Label>
            <div className="flex items-center space-x-4">
              <UnifiedAvatar 
                src={user.avatar_url} 
                name={user?.name || "User"}
                size="lg"
              />
              <div className="text-xs break-all">
                <strong>URL:</strong> {user.avatar_url}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvatarUploadTest;