
import React from 'react';
import { capitalizeFirst } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { User } from 'lucide-react';

interface AboutProviderProps {
  name: string;
  about: string;
  joinedDate: Date;
  totalServices?: number;
}

const AboutProvider: React.FC<AboutProviderProps> = ({
  name,
  about,
  joinedDate,
  totalServices = 0,
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          Acerca de {name}
        </CardTitle>
        <CardDescription>
          Miembro desde {capitalizeFirst(joinedDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }))}
          {totalServices > 0 && ` • ${totalServices} servicios realizados`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground leading-relaxed">{about}</p>
      </CardContent>
    </Card>
  );
};

export default AboutProvider;
