
import React, { useState } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { BlockedTimeSlot } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X, Plus, Clock } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const daysOfWeek = [
  { value: '0', label: 'Domingo' },
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' }
];

// Generate hour options from 8:00 AM to 8:00 PM
const hours = Array.from({ length: 13 }, (_, i) => {
  const hour = i + 8; // Starting from 8 AM
  return {
    value: hour.toString(),
    label: `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`
  };
});

const BlockedTimeSlots: React.FC = () => {
  const [blockedSlots, setBlockedSlots] = useState<BlockedTimeSlot[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const [day, setDay] = useState<string>('1');
  const [startHour, setStartHour] = useState<string>('9');
  const [endHour, setEndHour] = useState<string>('10');
  const [note, setNote] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState<boolean>(true);

  const handleAddBlock = () => {
    const start = parseInt(startHour);
    const end = parseInt(endHour);
    
    if (start >= end) {
      toast({
        title: 'Error',
        description: 'La hora de inicio debe ser anterior a la hora de fin',
        variant: 'destructive'
      });
      return;
    }
    
    const newSlot: BlockedTimeSlot = {
      id: Date.now().toString(),
      day: parseInt(day),
      startHour: start,
      endHour: end,
      note: note.trim() || undefined,
      isRecurring,
      createdAt: new Date()
    };
    
    setBlockedSlots([...blockedSlots, newSlot]);
    toast({
      title: 'Horario bloqueado',
      description: 'El horario ha sido bloqueado exitosamente.'
    });
    
    // Reset form
    setShowForm(false);
    setNote('');
    setIsRecurring(true);
  };

  const handleRemoveBlock = (id: string) => {
    setBlockedSlots(blockedSlots.filter(slot => slot.id !== id));
    toast({
      title: 'Horario desbloqueado',
      description: 'El horario ha sido desbloqueado exitosamente.'
    });
  };

  const getDayLabel = (dayNum: number) => {
    return daysOfWeek.find(d => d.value === dayNum.toString())?.label || '';
  };

  const formatHour = (hour: number) => {
    return `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
  };

  return (
    <Card className="glassmorphism">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl">Horarios Bloqueados</CardTitle>
            <CardDescription>
              Gestiona los horarios en los que no estás disponible
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowForm(!showForm)} 
            variant={showForm ? "outline" : "default"}
            size="sm"
          >
            {showForm ? (
              <>Cancelar</>
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" />
                Bloquear Horario
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="bg-background p-4 rounded-md mb-4 border animate-fade-in">
            <h3 className="text-lg font-medium mb-3">Nuevo Horario Bloqueado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="day">Día</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger id="day">
                    <SelectValue placeholder="Seleccionar día" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map(day => (
                      <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor="startHour">Hora Inicio</Label>
                  <Select value={startHour} onValueChange={setStartHour}>
                    <SelectTrigger id="startHour">
                      <SelectValue placeholder="Hora inicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map(hour => (
                        <SelectItem key={hour.value} value={hour.value}>{hour.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor="endHour">Hora Fin</Label>
                  <Select value={endHour} onValueChange={setEndHour}>
                    <SelectTrigger id="endHour">
                      <SelectValue placeholder="Hora fin" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map(hour => (
                        <SelectItem key={hour.value} value={hour.value}>{hour.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="note">Nota (opcional)</Label>
              <Input
                id="note"
                placeholder="Ej: Almuerzo, Reunión, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox 
                id="recurring" 
                checked={isRecurring} 
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <Label htmlFor="recurring" className="text-sm">
                Repetir semanalmente
              </Label>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleAddBlock}>
                Guardar Bloqueo
              </Button>
            </div>
          </div>
        )}
        
        {blockedSlots.length > 0 ? (
          <div className="space-y-2">
            {blockedSlots.map(slot => (
              <div 
                key={slot.id} 
                className="flex items-center justify-between p-3 bg-background hover:bg-accent/20 transition-colors rounded-md border"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-navy/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-navy" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {getDayLabel(slot.day)} • {formatHour(slot.startHour)} - {formatHour(slot.endHour)}
                    </p>
                    {slot.note && <p className="text-sm text-muted-foreground">{slot.note}</p>}
                    {slot.isRecurring && (
                      <div className="text-xs text-navy bg-navy/10 px-2 py-0.5 rounded-full inline-block mt-1">
                        Semanal
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => handleRemoveBlock(slot.id)} 
                  variant="ghost" 
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            <p>No hay horarios bloqueados</p>
            <p className="text-sm">Agrega bloques de tiempo en los que no estés disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockedTimeSlots;
