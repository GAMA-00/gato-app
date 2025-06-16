
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
      isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
      "min-h-screen w-full bg-white",
      className
    )}>
      {/* Scrollable container for all content */}
      <div className={cn(
        "w-full min-h-screen overflow-y-auto",
        // Check if className contains flex items-center justify-center for special centering
        className?.includes("flex items-center justify-center") 
          ? "flex flex-col justify-center items-center" 
          : "flex flex-col justify-center items-center",
        isMobile ? "p-4 pb-20" : "p-6"
      )}>
        <div className={cn(
          "max-w-7xl w-full animate-fade-in",
          "flex flex-col items-center justify-center"
        )}>
          <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-center gap-1 w-full",
            isMobile ? "mb-6" : "mb-6"
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
          
          {/* Content area with scroll capability */}
          <div className={cn(
            "animate-slide-up flex justify-center w-full",
            "flex-1 items-start"
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
