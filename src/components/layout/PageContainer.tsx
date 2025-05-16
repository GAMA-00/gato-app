
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
      isMobile ? "pt-1 pb-24" : "pl-64 pt-1", 
      "min-h-screen w-full overflow-y-auto", 
      className || "bg-app-background"
    )}>
      <div className={cn("p-4 md:p-8 max-w-7xl animate-fade-in")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-app-text">{title}</h1>
            {subtitle && <div className="text-app-text/70 text-lg">{subtitle}</div>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className="animate-slide-up pb-12">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
