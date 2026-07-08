import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Edit, Trash2 } from 'lucide-react';
import { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const MAX_VISIBLE = 3;

const formatColones = (price: number | string) => {
  const n = Number(price);
  if (!n && n !== 0) return '—';
  return `₡${n.toLocaleString('es-CR')}`;
};

const formatDuration = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit, onDelete }) => {
  const variants = Array.isArray(service.serviceVariants) ? service.serviceVariants : [];
  const visible = variants.slice(0, MAX_VISIBLE);
  const extra = variants.length - MAX_VISIBLE;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Nombre del negocio */}
        <h3 className="text-base font-semibold leading-tight mb-0.5">{service.name}</h3>
        {service.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{service.description}</p>
        )}

        {/* Variantes del catálogo */}
        {visible.length > 0 ? (
          <div className="divide-y divide-border rounded-lg border overflow-hidden">
            {visible.map((v, i) => (
              <div key={v.id ?? i} className="flex items-center justify-between px-3 py-2 bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(Number(v.duration) || 0)}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground ml-3 shrink-0">
                  {formatColones(v.price)}
                </span>
              </div>
            ))}
            {extra > 0 && (
              <div className="px-3 py-1.5 text-xs text-center text-muted-foreground bg-muted/10">
                +{extra} {extra === 1 ? 'servicio más' : 'servicios más'}
              </div>
            )}
          </div>
        ) : (
          /* Fallback: listing sin variantes */
          <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(service.duration ?? 0)}</span>
            </div>
            <span className="text-sm font-semibold">{formatColones(service.price ?? 0)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 px-5 py-3 flex gap-2">
        <Button
          variant="outline"
          onClick={() => onEdit(service)}
          className="flex-1"
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDelete(service)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;
