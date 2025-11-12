
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
        <label className="text-sm font-medium mb-2 block text-foreground">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Instrucciones especiales, preferencias, etc."
          className="w-full p-2.5 border rounded-lg min-h-[80px] resize-none text-sm"
        />
      </CardContent>
    </Card>
  );
};

export default NotesSection;
