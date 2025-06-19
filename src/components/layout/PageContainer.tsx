
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
      "w-full bg-white",
      isCenteredLayout 
        ? (isMobile ? "h-screen overflow-hidden" : "h-screen overflow-hidden")
        : "min-h-screen",
      className
    )}>
      {/* Container for all content */}
      <div className={cn(
        "w-full h-full",
        isCenteredLayout 
          ? "flex flex-col justify-center items-center" 
          : "flex flex-col justify-start items-center",
        // Mejorar padding para dispositivos móviles
        isMobile && isCenteredLayout ? "p-1" : (isMobile ? "px-4 pt-4 pb-24" : "p-6")
      )}>
        <div className={cn(
          "max-w-7xl w-full animate-fade-in",
          "flex flex-col items-center justify-start",
          isCenteredLayout && isMobile ? "h-full justify-center" : ""
        )}>
          {/* Header section */}
          {(title || subtitle || action) && (
            <div className={cn(
              "flex flex-col md:flex-row md:items-center justify-center gap-1 w-full",
              // Reducir margen inferior en móvil
              isMobile && isCenteredLayout ? "mb-0" : (isMobile ? "mb-3" : "mb-6")
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
          )}
          
          {/* Content area - minimizar espacios en móvil */}
          <div className={cn(
            "animate-slide-up flex justify-center w-full",
            isCenteredLayout ? "flex-1 items-center justify-center" : "flex-1 items-start",
            // Reducir margen superior en móvil
            isMobile && isCenteredLayout ? "-mt-2" : (isMobile ? "mt-2" : "mt-4")
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
