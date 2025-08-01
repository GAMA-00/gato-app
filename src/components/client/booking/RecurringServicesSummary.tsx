
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Calendar, Clock, CheckCircle, Repeat } from 'lucide-react';
import { RecurringServicesSummary } from '@/hooks/useRecurringServices';

interface RecurringServicesSummaryProps {
  summary: RecurringServicesSummary;
  isLoading?: boolean;
}

export const RecurringServicesSummaryCard = ({ 
  summary, 
  isLoading = false 
}: RecurringServicesSummaryProps) => {
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (summary.totalRecurringServices === 0) {
    return null;
  }

  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Servicios Recurrentes</h3>
          </div>
          <Badge variant="outline" className="bg-white/70 border-blue-300 text-blue-800">
            {summary.totalRecurringServices} {summary.totalRecurringServices === 1 ? 'servicio' : 'servicios'}
          </Badge>
        </div>
        
        <div className="text-sm text-blue-700 mb-3">
          <CheckCircle className="inline h-4 w-4 mr-1" />
          {summary.totalActiveInstances} citas activas programadas
        </div>

        <div className="flex flex-wrap gap-2">
          {summary.weeklyServices > 0 && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              <RotateCcw className="h-3 w-3 mr-1" />
              {summary.weeklyServices} Semanal{summary.weeklyServices > 1 ? 'es' : ''}
            </Badge>
          )}
          
          {summary.biweeklyServices > 0 && (
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
              <Calendar className="h-3 w-3 mr-1" />
              {summary.biweeklyServices} Quincenal{summary.biweeklyServices > 1 ? 'es' : ''}
            </Badge>
          )}
          
          {summary.triweeklyServices > 0 && (
            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
              <Repeat className="h-3 w-3 mr-1" />
              {summary.triweeklyServices} Trisemanal{summary.triweeklyServices > 1 ? 'es' : ''}
            </Badge>
          )}
          
          {summary.monthlyServices > 0 && (
            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
              <Clock className="h-3 w-3 mr-1" />
              {summary.monthlyServices} Mensual{summary.monthlyServices > 1 ? 'es' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
