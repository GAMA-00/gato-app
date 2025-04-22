
import React from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface PageContainerProps {
  children: React.ReactNode;
  title: React.ReactNode; // Changed from string to ReactNode
  subtitle?: React.ReactNode; // Changed from string to ReactNode
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
      isMobile ? "pt-2" : "pl-64", // Further reduced top padding in mobile
      "min-h-screen bg-background", 
      className
    )}>
      <div className={cn("p-4 md:p-8 max-w-7xl animate-fade-in")}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-1">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
        <div className="animate-slide-up">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageContainer;
