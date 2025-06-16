
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
  
  // Check if this should be a centered layout (no scroll)
  const isCenteredLayout = className?.includes("flex items-center justify-center");
  
  return (
    <div className={cn(
      isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
      isCenteredLayout ? "h-screen w-full overflow-hidden bg-white" : "min-h-screen w-full bg-white",
      className
    )}>
      {/* Container for all content */}
      <div className={cn(
        "w-full",
        isCenteredLayout 
          ? "h-full flex flex-col justify-center items-center" 
          : "min-h-screen overflow-y-auto flex flex-col justify-center items-center",
        // Eliminar padding en móvil para layout centrado
        isMobile && isCenteredLayout ? "p-0" : (isMobile ? "p-4 pb-20" : "p-6")
      )}>
        <div className={cn(
          "max-w-7xl w-full animate-fade-in",
          "flex flex-col items-center justify-center"
        )}>
          <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-center gap-1 w-full",
            // Ajustar margen inferior para layout centrado en móvil
            isMobile && isCenteredLayout ? "mb-2" : (isMobile ? "mb-6" : "mb-6")
          )}>
            {/* Center title container with full width */}
            <div className="w-full flex justify-center">
              <h1 className={cn(
                "font-bold tracking-tight text-app-text text-center",
                isMobile ? "text-xl mb-2" : "text-2xl md:text-3xl mb-1"
              )}>{title}</h1>
            </div>
            {subtitle && <div className={cn(
              "text-app-text/70 text-center w-full",
              isMobile ? "text-base" : "text-lg mt-1"
            )}>{subtitle}</div>}
            {action && <div className="flex-shrink-0 mt-1 md:mt-0">{action}</div>}
          </div>
          
          {/* Content area */}
          <div className={cn(
            "animate-slide-up flex justify-center w-full",
            isCenteredLayout ? "flex-1 items-center" : "flex-1 items-start"
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
