
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProviderProfile } from '@/lib/types';

interface ProviderAboutProps {
  provider: ProviderProfile;
}

const ProviderAbout = ({ provider }: ProviderAboutProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Sobre mí</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Manual experience years */}
          {provider.experienceYears > 0 && (
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
              <div className="text-sm font-medium text-stone-700 mb-1">Años de experiencia</div>
              <div className="text-base font-semibold text-stone-800">
                {provider.experienceYears} año{provider.experienceYears !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          
          {/* About me text content */}
          <p className="text-muted-foreground">{provider.aboutMe}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAbout;
