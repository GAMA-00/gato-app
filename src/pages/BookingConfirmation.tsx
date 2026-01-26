import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Banknote } from 'lucide-react';

export function BookingConfirmation() {
  const { appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type'); // 'recurring' or 'once'
  const payment = searchParams.get('payment'); // 'direct' or null

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  const isDirectPayment = payment === 'direct';

  const message = type === 'recurring' 
    ? '¡Cita recurrente creada con éxito!'
    : '¡Cita creada con éxito!';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          {/* Large green check */}
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
            <div className="relative bg-background border-2 border-green-500/30 rounded-full p-6">
              <CheckCircle2 className="h-24 w-24 text-green-600" strokeWidth={2} />
            </div>
          </div>

          {/* Success message */}
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            {message}
          </h1>

          {/* Direct payment notice */}
          {isDirectPayment && (
            <div className="flex items-center gap-2 bg-muted/50 text-muted-foreground px-4 py-3 rounded-lg">
              <Banknote className="h-5 w-5 text-success flex-shrink-0" />
              <p className="text-sm">
                El pago se realizará directamente con el proveedor
              </p>
            </div>
          )}

          {/* Action button */}
          <Button
            onClick={() => navigate('/client/bookings')}
            size="lg"
            className="mt-8"
          >
            Ir a Mis Reservas
          </Button>
        </div>
      </div>
    </div>
  );
}
