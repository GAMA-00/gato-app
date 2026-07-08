import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ProviderDashboardHeaderProps {
  userName: string;
  slug?: string | null;
}

const ProviderDashboardHeader: React.FC<ProviderDashboardHeaderProps> = ({ userName, slug }) => {
  const [copied, setCopied] = useState(false);

  const bookingUrl = slug ? `${window.location.origin}/${slug}` : null;

  const handleCopy = async () => {
    if (!bookingUrl) return;
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success('Link copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!bookingUrl) return;
    if (navigator.share) {
      await navigator.share({ title: 'Mi link de reserva — Gato', url: bookingUrl });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold text-foreground">
        Bienvenido, {userName}
      </h1>


      {bookingUrl && (
        <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 shadow-sm">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tu link de reserva
            </p>
            <p className="truncate text-sm font-medium text-primary">{bookingUrl}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleCopy}
              title="Copiar link"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleShare}
              title="Compartir"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboardHeader;
