
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ProviderBioProps {
  aboutMe?: string;
}

const ProviderBio = ({ aboutMe }: ProviderBioProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Sobre mí</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-line">
          {aboutMe || 'Este profesional aún no ha añadido información sobre su perfil.'}
        </p>
      </CardContent>
    </Card>
  );
};

export default ProviderBio;
