
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProviderProfile } from '@/lib/types';

interface ProviderAboutProps {
  provider: ProviderProfile;
}

const ProviderAbout = ({ provider }: ProviderAboutProps) => {
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Sobre mí</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expanded ? (
            <>
              <p className="text-muted-foreground">{provider.aboutMe}</p>
              <Button 
                variant="link" 
                onClick={toggleExpanded}
                className="p-0 h-auto text-luxury-navy"
              >
                Ver menos
              </Button>
            </>
          ) : (
            <>
              <p className="text-muted-foreground line-clamp-3">{provider.aboutMe}</p>
              <Button 
                variant="link" 
                onClick={toggleExpanded}
                className="p-0 h-auto text-luxury-navy"
              >
                Ver más
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAbout;
