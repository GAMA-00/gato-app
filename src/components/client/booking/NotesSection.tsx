
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

const NotesSection = ({ notes, onNotesChange }: NotesSectionProps) => {
  return (
    <Card>
      <CardContent className="pt-3 pb-2 px-4">
        <label className="text-xs font-medium mb-1 block text-foreground">
          Notas adicionales (opcional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Instrucciones especiales, preferencias, etc."
          className="w-full p-2 border rounded-lg text-sm"
        />
      </CardContent>
    </Card>
  );
};

export default NotesSection;
