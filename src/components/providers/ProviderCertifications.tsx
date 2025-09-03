import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';

interface ProviderCertificationsProps {
  provider: ProviderProfile;
}

const ProviderCertifications = ({ provider }: ProviderCertificationsProps) => {
  if (!provider.hasCertifications || !provider.certificationFiles || provider.certificationFiles.length === 0) {
    return null;
  }

  const handleCertificationClick = (file: any) => {
    try {
      const url = file.url || file.downloadUrl || '';
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Error opening certification:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Certificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {provider.certificationFiles.map((file, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 rounded-md bg-muted/80 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleCertificationClick(file)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {file.name || 'Certificación profesional'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Hacer clic para ver
                  </p>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCertifications;