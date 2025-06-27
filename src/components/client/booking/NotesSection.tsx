
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

const NotesSection = ({ notes, onNotesChange }: NotesSectionProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <label className="text-base font-medium mb-3 block">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Instrucciones especiales, preferencias, etc."
          className="w-full p-3 border rounded-lg min-h-[100px] resize-none"
        />
      </CardContent>
    </Card>
  );
};

export default NotesSection;
