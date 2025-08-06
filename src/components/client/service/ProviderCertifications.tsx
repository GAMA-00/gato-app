
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { CertificationFile } from './types';

interface ProviderCertificationsProps {
  certifications: CertificationFile[] | null | undefined;
}

const ProviderCertifications = ({ certifications }: ProviderCertificationsProps) => {
  if (!certifications || certifications.length === 0) {
    return null;
  }

  // Filtrar solo archivos PDF
  const pdfFiles = certifications.filter(file => 
    file.type === 'application/pdf' || 
    file.url?.toLowerCase().endsWith('.pdf')
  );

  if (pdfFiles.length === 0) {
    return null;
  }

  const handleCertificationClick = (file: CertificationFile) => {
    try {
      // Crear una URL que fuerce la descarga con el Content-Type correcto
      const link = document.createElement('a');
      link.href = file.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Para PDFs, añadir parámetros que ayuden con la visualización
      if (file.type === 'application/pdf' || file.url?.toLowerCase().endsWith('.pdf')) {
        // Forzar que se abra como PDF y no como texto
        const url = new URL(file.url);
        url.searchParams.set('response-content-type', 'application/pdf');
        url.searchParams.set('response-content-disposition', 'inline');
        link.href = url.toString();
      }
      
      link.click();
    } catch (error) {
      console.error('Error opening certification:', error);
      // Fallback a window.open
      window.open(file.url, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Certificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pdfFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-blue-600 mr-3" />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCertificationClick(file)}
                className="text-blue-700 font-medium"
              >
                Certificación <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCertifications;
