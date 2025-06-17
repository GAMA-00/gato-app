
import React, { useEffect } from 'react';
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
  
  // Check if this should be a centered layout (no scroll)
  const isCenteredLayout = className?.includes("flex items-center justify-center");
  
  return (
    <div className={cn(
      isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
      isCenteredLayout 
        ? (isMobile ? "h-screen w-full bg-white overflow-hidden" : "h-screen w-full overflow-hidden bg-white")
        : "min-h-screen w-full bg-white",
      className
    )}>
      {/* Container for all content */}
      <div className={cn(
        "w-full h-full",
        isCenteredLayout 
          ? "flex flex-col justify-center items-center" 
          : "min-h-screen overflow-y-auto flex flex-col justify-start items-center",
        // Eliminar padding superior en mobile para maximizar espacio
        isMobile && isCenteredLayout ? "p-1" : (isMobile ? "px-4 pt-2 pb-20" : "p-6")
      )}>
        <div className={cn(
          "max-w-7xl w-full animate-fade-in",
          "flex flex-col items-center justify-start",
          isCenteredLayout && isMobile ? "h-full justify-center" : ""
        )}>
          <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-center gap-1 w-full",
            // Reducir margen inferior en móvil
            isMobile && isCenteredLayout ? "mb-0" : (isMobile ? "mb-1" : "mb-4")
          )}>
            {/* Center title container with full width */}
            <div className="w-full flex justify-center">
              <h1 className={cn(
                "font-bold tracking-tight text-app-text text-center",
                // Reducir tamaño de texto en móvil
                isMobile ? "text-lg mb-0" : "text-2xl md:text-3xl mb-0"
              )}>{title}</h1>
            </div>
            {subtitle && <div className={cn(
              "text-app-text/70 text-center w-full",
              isMobile ? "text-sm mt-0" : "text-lg mt-0"
            )}>{subtitle}</div>}
            {action && <div className="flex-shrink-0 mt-1 md:mt-0">{action}</div>}
          </div>
          
          {/* Content area - minimizar espacios en móvil */}
          <div className={cn(
            "animate-slide-up flex justify-center w-full",
            isCenteredLayout ? "flex-1 items-center justify-center" : "flex-1 items-start",
            // Reducir margen superior en móvil
            isMobile && isCenteredLayout ? "-mt-2" : (isMobile ? "mt-1" : "mt-4")
          )}>
            <div className="w-full flex justify-center">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
