import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export function BookingConfirmation() {
  const { appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type'); // 'recurring' or 'once'

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

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
