
import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageContainerProps {
  children: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  action,
  className
}) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={cn(
      isMobile ? "pt-0 pb-24" : "pl-64 pt-4", // Añadido padding-top en desktop
      "min-h-screen w-full overflow-y-auto bg-white",
      className
    )}>
      {/* Optimizado el padding para móvil y desktop */}
      <div className={cn("p-1 md:p-6 max-w-7xl animate-fade-in")}>
        <div className={cn(
          "flex flex-col md:flex-row md:items-center justify-center gap-1", // Changed justify-between to justify-center
          isMobile ? "mt-0 mb-1" : "mb-6" // Mayor margen inferior en desktop
        )}>
          {/* Contenedor del título con márgenes adecuados y centrado */}
          <div className="w-full text-center"> {/* Added text-center class */}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 text-app-text">{title}</h1>
            {subtitle && <div className="text-app-text/70 text-lg mt-1">{subtitle}</div>}
          </div>
          {action && <div className="flex-shrink-0 mt-2 md:mt-0">{action}</div>}
        </div>
        
        {/* Añadir espacio adicional entre el título y el contenido SOLO en móvil */}
        {isMobile && <div className="h-4"></div>}
        
        <div className="animate-slide-up pb-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
