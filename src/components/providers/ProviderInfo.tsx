
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ProviderProfile } from '@/lib/types';

interface ProviderInfoProps {
  provider: ProviderProfile;
}

const ProviderInfo = ({ provider }: ProviderInfoProps) => {
  // Preguntas y respuestas del proveedor
  const questions = [
    {
      question: "¿Cuánta experiencia tienes como profesional?",
      answer: `${provider.experienceYears} ${provider.experienceYears === 1 ? 'año' : 'años'}`
    },
    {
      question: "¿Tienes alguna certificación profesional?",
      answer: provider.hasCertifications ? "Sí" : "No"
    },
    {
      question: "¿Atiendes a mascotas potencialmente peligrosas?",
      answer: provider.handlesDangerousDogs ? "Sí" : "No"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Información de interés</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((item, index) => (
            <div key={index} className="space-y-1">
              <h4 className="font-medium">{item.question}</h4>
              <p className="text-muted-foreground">{item.answer}</p>
              {index < questions.length - 1 && <div className="border-t my-3" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderInfo;
