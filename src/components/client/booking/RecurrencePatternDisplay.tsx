/**
 * COMPONENTE DE VISUALIZACIÓN DE PATRÓN DE RECURRENCIA
 * ====================================================
 * 
 * Muestra información clara sobre el patrón de recurrencia seleccionado
 * Especialmente útil para recurrencia mensual con patrones semanales
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { Calendar, Clock, RefreshCw, AlertCircle } from 'lucide-react';
import { getWeekPattern, getMonthlyPatternDescription, calculateMonthlyByWeekPattern } from '@/utils/monthlyRecurrenceUtils';

interface RecurrencePatternDisplayProps {
  frequency: string;
  selectedDate?: Date;
  selectedTime?: string;
  className?: string;
}

const RecurrencePatternDisplay = ({
  frequency,
  selectedDate,
  selectedTime,
  className = ''
}: RecurrencePatternDisplayProps) => {
  if (frequency === 'once' || !selectedDate) {
    return null;
  }

  const getFrequencyText = (freq: string) => {
    switch (freq) {
      case 'weekly': return 'Semanal';
      case 'biweekly': return 'Quincenal';
      case 'triweekly': return 'Trisemanal';
      case 'monthly': return 'Mensual';
      default: return 'Una vez';
    }
  };

  const getPatternDescription = () => {
    switch (frequency) {
      case 'weekly':
        return `Cada ${formatDateES(selectedDate, 'EEEE', { locale: es })}`;
      
      case 'biweekly':
        return `Cada dos semanas, los ${formatDateES(selectedDate, 'EEEE', { locale: es })}`;
      
      case 'triweekly':
        return `Cada tres semanas, los ${formatDateES(selectedDate, 'EEEE', { locale: es })}`;
      
      case 'monthly':
        return getMonthlyPatternDescription(selectedDate);
      
      default:
        return '';
    }
  };

  const getExampleDates = () => {
    if (!selectedDate || frequency === 'once') return [];
    
    const examples: Date[] = [];
    let currentDate = new Date(selectedDate);
    
    // Generar 3 ejemplos de fechas futuras
    for (let i = 0; i < 3; i++) {
      switch (frequency) {
        case 'weekly':
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        
        case 'biweekly':
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        
        case 'triweekly':
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 21);
          break;
        
        case 'monthly':
          // Usar la nueva lógica de patrón semanal
          currentDate = calculateMonthlyByWeekPattern(currentDate, currentDate);
          break;
      }
      
      examples.push(new Date(currentDate));
    }
    
    return examples;
  };

  const exampleDates = getExampleDates();

  return (
    <Card className={`border-primary/20 bg-primary/5 ${className}`}>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            <span className="font-medium text-primary">
              Servicio {getFrequencyText(frequency)}
            </span>
          </div>

          {/* Pattern Description */}
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {getPatternDescription()}
              </p>
              
              {/* Special note for monthly */}
              {frequency === 'monthly' && (
                <p className="text-xs text-gray-600 mt-1">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Mantiene el patrón semanal mes a mes
                </p>
              )}
            </div>
          </div>

          {/* Selected Time */}
          {selectedTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-700">
                Siempre a las {selectedTime}
              </span>
            </div>
          )}

          {/* Example Future Dates */}
          {exampleDates.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                Próximas citas programadas:
              </p>
              <div className="flex flex-wrap gap-1">
                {exampleDates.map((date, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-gray-100 text-gray-700 border-gray-200"
                  >
                    {formatDateES(date, 'd MMM', { locale: es })}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecurrencePatternDisplay;