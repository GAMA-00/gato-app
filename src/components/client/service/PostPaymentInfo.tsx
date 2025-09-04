import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, CheckCircle2, Clock } from 'lucide-react';

interface ServiceInfoProps {
  isPostPayment: boolean;
}

const ServiceInfo = ({ isPostPayment }: ServiceInfoProps) => {
  return (
    <Alert className="border-l-4 border-l-blue-500 bg-blue-50/50 border-blue-200">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertDescription>
        <div className="space-y-3">
          <h4 className="font-semibold text-blue-900 mb-2">Información importante del servicio</h4>
          
          <div className="space-y-2 text-sm">
            {/* Solo para servicios postpago */}
            {isPostPayment && (
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                <div>
                  <span className="font-medium text-blue-900">Post pago: Insumos o gastos adicionales </span>
                  <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-xs font-medium">Post Pago</span>
                  <span className="text-blue-800"> se generarán como una factura al completar el servicio y aparecerán en la sección "Facturas" para ser aprobadas.</span>
                </div>
              </div>
            )}
            
            {/* Para ambos tipos de servicio */}
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium text-blue-900">Materiales incluidos:</span>
                <span className="text-blue-800"> el proveedor llevará los materiales básicos necesarios para realizar el servicio.</span>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
              <div>
                <span className="font-medium text-blue-900">Política de cancelación:</span>
              </div>
            </div>
            
            <div className="ml-4 space-y-1 text-blue-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Más de 24 horas antes: cancelación gratuita</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>Entre 2 y 24 horas antes: multa del 20%</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span>Menos de 2 horas antes: multa del 50%</span>
              </div>
            </div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ServiceInfo;